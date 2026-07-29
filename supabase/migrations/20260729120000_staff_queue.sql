-- AutoBizMate protected staff queue
-- Schedule policy: 0 minutes before, 0 minutes after.
-- A 09:00 booking is actionable from 09:00:00 through 09:00:59.999
-- in the configured company timezone.

begin;

create extension if not exists pgcrypto;

create table if not exists public.staff_accounts (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  employee_code text not null,
  role text not null default 'staff'
    check (role in ('staff', 'manager', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company, auth_user_id),
  unique (company, employee_code)
);

comment on table public.staff_accounts is
  'Maps authenticated Supabase users to an active AutoBizMate employee and company.';

alter table public.booking
  add column if not exists arrived_at timestamptz,
  add column if not exists service_started_at timestamptz,
  add column if not exists service_completed_at timestamptz,
  add column if not exists started_by uuid references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

alter table public.waiting_list
  add column if not exists started_by uuid references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

create or replace function public.autobizmate_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_accounts_touch_updated_at on public.staff_accounts;
create trigger staff_accounts_touch_updated_at
before update on public.staff_accounts
for each row execute function public.autobizmate_touch_updated_at();

-- Existing operational tables contain some date/time values as text. These
-- helpers convert valid values without allowing one malformed legacy row to
-- break the whole queue.
create or replace function public.autobizmate_try_date(p_value text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return p_value::date;
exception when others then
  return null;
end;
$$;

create or replace function public.autobizmate_try_time(p_value text)
returns time
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return p_value::time;
exception when others then
  return null;
end;
$$;

create or replace function public.autobizmate_try_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.autobizmate_safe_nonnegative_int(
  p_value text,
  p_fallback integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value integer;
begin
  v_value := p_value::integer;
  return greatest(v_value, 0);
exception when others then
  return greatest(p_fallback, 0);
end;
$$;

-- Store the agreed exact-minute schedule rule as company configuration.
-- RPCs read these settings; the values are not embedded in queue filtering.
update public.chatbot_company_settings
set
  queue_config_json = jsonb_set(
    coalesce(queue_config_json, '{}'::jsonb),
    '{staffDashboardConfig}',
    jsonb_build_object(
      'scheduledArrivalWindowMinutesBefore', 0,
      'scheduledArrivalWindowMinutesAfter', 0
    ),
    true
  ),
  "updatedAt" = now();

create index if not exists staff_accounts_auth_user_id_idx
  on public.staff_accounts (auth_user_id);
create index if not exists staff_accounts_company_idx
  on public.staff_accounts (company);
create index if not exists employee_company_employee_code_idx
  on public.employee (company, employee_code);
create index if not exists booking_staff_queue_idx
  on public.booking (company, employee_code, booking_date, status);
create index if not exists waiting_list_staff_queue_idx
  on public.waiting_list (company, assigned_staff_id, queue_date, status);
create index if not exists services_company_service_code_idx
  on public.services (company, service_code);

alter table public.staff_accounts enable row level security;
alter table public.employee enable row level security;
alter table public.booking enable row level security;
alter table public.waiting_list enable row level security;
alter table public.chatbot_company_settings enable row level security;

drop policy if exists "Staff can read own account" on public.staff_accounts;
create policy "Staff can read own account"
on public.staff_accounts
for select
to authenticated
using (auth_user_id = (select auth.uid()));

drop policy if exists "Staff can read own employee profile" on public.employee;
create policy "Staff can read own employee profile"
on public.employee
for select
to authenticated
using (
  coalesce(is_active, 0) = 1
  and exists (
    select 1
    from public.staff_accounts sa
    where sa.auth_user_id = (select auth.uid())
      and sa.is_active
      and sa.company = employee.company
      and sa.employee_code = employee.employee_code
  )
);

drop policy if exists "Staff can read assigned bookings" on public.booking;
create policy "Staff can read assigned bookings"
on public.booking
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_accounts sa
    where sa.auth_user_id = (select auth.uid())
      and sa.is_active
      and sa.company = booking.company
      and sa.employee_code = booking.employee_code
  )
);

drop policy if exists "Staff can read assigned waiting list" on public.waiting_list;
create policy "Staff can read assigned waiting list"
on public.waiting_list
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_accounts sa
    where sa.auth_user_id = (select auth.uid())
      and sa.is_active
      and sa.company = waiting_list.company
      and sa.employee_code = waiting_list.assigned_staff_id
  )
);

drop policy if exists "Staff can read own company settings"
  on public.chatbot_company_settings;
create policy "Staff can read own company settings"
on public.chatbot_company_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_accounts sa
    where sa.auth_user_id = (select auth.uid())
      and sa.is_active
      and sa.company = chatbot_company_settings.company
  )
);

create or replace function public.get_staff_queue_today()
returns table (
  source_type text,
  source_id text,
  reference_id text,
  company text,
  employee_code text,
  customer_name text,
  service_code text,
  service_name text,
  queue_date date,
  scheduled_date date,
  scheduled_start_time time,
  joined_at timestamptz,
  arrived_at timestamptz,
  service_started_at timestamptz,
  status text,
  queue_position bigint,
  priority_group integer,
  priority_time timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company text;
  v_employee_code text;
  v_timezone text;
  v_local_now timestamp;
  v_window_before integer := 0;
  v_window_after integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select
    sa.company,
    sa.employee_code,
    coalesce(nullif(e.timezone, ''), nullif(ccs.timezone, ''), 'Asia/Manila'),
    public.autobizmate_safe_nonnegative_int(
      ccs.queue_config_json #>> '{staffDashboardConfig,scheduledArrivalWindowMinutesBefore}',
      0
    ),
    public.autobizmate_safe_nonnegative_int(
      ccs.queue_config_json #>> '{staffDashboardConfig,scheduledArrivalWindowMinutesAfter}',
      0
    )
  into
    v_company,
    v_employee_code,
    v_timezone,
    v_window_before,
    v_window_after
  from public.staff_accounts sa
  join public.employee e
    on e.company = sa.company
   and e.employee_code = sa.employee_code
   and coalesce(e.is_active, 0) = 1
  left join public.chatbot_company_settings ccs
    on ccs.company = sa.company
   and coalesce(ccs.is_active, true)
  where sa.auth_user_id = v_user_id
    and sa.is_active
  limit 1;

  if v_company is null or v_employee_code is null then
    raise exception 'STAFF_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  v_local_now := now() at time zone v_timezone;

  return query
  with booking_source as (
    select
      'booking'::text as source_type,
      b.id::text as source_id,
      coalesce(nullif(b.booking_id, ''), b.id::text) as reference_id,
      b.company,
      b.employee_code,
      coalesce(nullif(b.customer_name, ''), 'Customer') as customer_name,
      b.service_code,
      coalesce(nullif(s.service_name, ''), nullif(b.service_code, '')) as service_name,
      public.autobizmate_try_date(b.booking_date) as queue_date,
      public.autobizmate_try_date(b.booking_date) as scheduled_date,
      public.autobizmate_try_time(b.start_time) as scheduled_start_time,
      b."createdAt" as joined_at,
      b.arrived_at,
      b.service_started_at,
      b.status,
      null::bigint as queue_position,
      case when b.status = 'in_service' then 1 else 2 end::integer
        as priority_group,
      case
        when b.status = 'in_service' then b.service_started_at
        else (
          public.autobizmate_try_date(b.booking_date)
          + public.autobizmate_try_time(b.start_time)
        ) at time zone v_timezone
      end as priority_time
    from public.booking b
    left join public.services s
      on s.company = b.company
     and s.service_code = b.service_code
    where b.company = v_company
      and b.employee_code = v_employee_code
      and public.autobizmate_try_date(b.booking_date) = v_local_now::date
      and (
        b.status = 'in_service'
        or (
          b.status = 'confirmed'
          and b.arrived_at is not null
          and public.autobizmate_try_time(b.start_time) is not null
          and v_local_now >= (
            public.autobizmate_try_date(b.booking_date)
            + public.autobizmate_try_time(b.start_time)
            - (v_window_before * interval '1 minute')
          )
          and v_local_now < (
            public.autobizmate_try_date(b.booking_date)
            + public.autobizmate_try_time(b.start_time)
            + ((v_window_after + 1) * interval '1 minute')
          )
        )
      )
  ),
  waiting_source as (
    select
      'waiting_list'::text as source_type,
      w.id::text as source_id,
      coalesce(nullif(w.waiting_list_reference, ''), w.id::text) as reference_id,
      w.company,
      w.assigned_staff_id as employee_code,
      coalesce(nullif(w.customer_name, ''), 'Customer') as customer_name,
      w.service_code,
      coalesce(
        nullif(w.service_label, ''),
        nullif(s.service_name, ''),
        nullif(w.service_code, '')
      ) as service_name,
      public.autobizmate_try_date(w.queue_date) as queue_date,
      null::date as scheduled_date,
      null::time as scheduled_start_time,
      w.joined_at,
      coalesce(
        public.autobizmate_try_timestamptz(w.confirmed_at),
        w.joined_at
      ) as arrived_at,
      public.autobizmate_try_timestamptz(w.service_started_at)
        as service_started_at,
      w.status,
      row_number() over (
        order by
          coalesce(
            public.autobizmate_try_timestamptz(w.confirmed_at),
            w.joined_at
          ) asc nulls last,
          w.joined_at asc nulls last,
          w.id asc
      )::bigint as queue_position,
      case when w.status = 'in_service' then 1 else 3 end::integer
        as priority_group,
      case
        when w.status = 'in_service'
          then public.autobizmate_try_timestamptz(w.service_started_at)
        else coalesce(
          public.autobizmate_try_timestamptz(w.confirmed_at),
          w.joined_at
        )
      end as priority_time
    from public.waiting_list w
    left join public.services s
      on s.company = w.company
     and s.service_code = w.service_code
    where w.company = v_company
      and w.assigned_staff_id = v_employee_code
      and public.autobizmate_try_date(w.queue_date) = v_local_now::date
      and w.status in ('confirmed', 'in_service')
  ),
  queue as (
    select * from booking_source
    union all
    select * from waiting_source
  )
  select *
  from queue
  order by
    queue.priority_group asc,
    queue.priority_time asc nulls last,
    queue.arrived_at asc nulls last,
    queue.joined_at asc nulls last,
    queue.reference_id asc;
end;
$$;

create or replace function public.start_queue_item(
  p_source_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company text;
  v_employee_code text;
  v_item jsonb;
  v_in_service_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select company, employee_code
  into v_company, v_employee_code
  from public.staff_accounts
  where auth_user_id = v_user_id and is_active
  limit 1;

  if v_company is null then
    raise exception 'STAFF_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.get_staff_queue_today() q
    where q.source_type = p_source_type
      and q.source_id = p_source_id
      and q.status = 'confirmed'
  ) then
    raise exception 'QUEUE_ITEM_NOT_ACTIONABLE' using errcode = 'P0001';
  end if;

  if p_source_type = 'booking' then
    update public.booking
    set
      status = 'in_service',
      service_started_at = now(),
      started_by = v_user_id,
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and employee_code = v_employee_code
      and status = 'confirmed'
    returning jsonb_build_object(
      'source_type', 'booking',
      'source_id', id::text,
      'reference_id', coalesce(nullif(booking_id, ''), id::text),
      'customer_name', customer_name,
      'status', status,
      'service_started_at', service_started_at
    ) into v_item;
  elsif p_source_type = 'waiting_list' then
    update public.waiting_list
    set
      status = 'in_service',
      service_started_at = now()::text,
      started_by = v_user_id,
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and assigned_staff_id = v_employee_code
      and status = 'confirmed'
    returning jsonb_build_object(
      'source_type', 'waiting_list',
      'source_id', id::text,
      'reference_id', coalesce(nullif(waiting_list_reference, ''), id::text),
      'customer_name', customer_name,
      'status', status,
      'service_started_at', service_started_at
    ) into v_item;
  else
    raise exception 'INVALID_SOURCE_TYPE' using errcode = '22023';
  end if;

  if v_item is null then
    raise exception 'QUEUE_ITEM_CHANGED' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_in_service_count
  from public.get_staff_queue_today() q
  where q.status = 'in_service';

  return jsonb_build_object(
    'item', v_item,
    'in_service_count', v_in_service_count
  );
exception
  when invalid_text_representation then
    raise exception 'INVALID_SOURCE_ID' using errcode = '22023';
end;
$$;

create or replace function public.complete_queue_item(
  p_source_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company text;
  v_employee_code text;
  v_updated_id text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select company, employee_code
  into v_company, v_employee_code
  from public.staff_accounts
  where auth_user_id = v_user_id and is_active
  limit 1;

  if v_company is null then
    raise exception 'STAFF_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if p_source_type = 'booking' then
    update public.booking
    set
      status = 'completed',
      service_completed_at = now(),
      completed_by = v_user_id,
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and employee_code = v_employee_code
      and status = 'in_service'
    returning id::text into v_updated_id;
  elsif p_source_type = 'waiting_list' then
    update public.waiting_list
    set
      status = 'completed',
      service_completed_at = now()::text,
      completed_by = v_user_id,
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and assigned_staff_id = v_employee_code
      and status = 'in_service'
    returning id::text into v_updated_id;
  else
    raise exception 'INVALID_SOURCE_TYPE' using errcode = '22023';
  end if;

  if v_updated_id is null then
    raise exception 'QUEUE_ITEM_CHANGED' using errcode = 'P0001';
  end if;

  return jsonb_build_object('success', true, 'source_id', v_updated_id);
exception
  when invalid_text_representation then
    raise exception 'INVALID_SOURCE_ID' using errcode = '22023';
end;
$$;

create or replace function public.cancel_queue_item(
  p_source_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company text;
  v_employee_code text;
  v_updated_id text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select company, employee_code
  into v_company, v_employee_code
  from public.staff_accounts
  where auth_user_id = v_user_id and is_active
  limit 1;

  if v_company is null then
    raise exception 'STAFF_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.get_staff_queue_today() q
    where q.source_type = p_source_type
      and q.source_id = p_source_id
  ) then
    raise exception 'QUEUE_ITEM_NOT_ACTIONABLE' using errcode = 'P0001';
  end if;

  if p_source_type = 'booking' then
    update public.booking
    set
      status = 'cancelled',
      cancelled_at = now()::text,
      cancelled_by = v_user_id::text,
      cancellation_source = 'staff_web',
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and employee_code = v_employee_code
      and status in ('confirmed', 'in_service')
    returning id::text into v_updated_id;
  elsif p_source_type = 'waiting_list' then
    update public.waiting_list
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_user_id::text,
      cancellation_source = 'staff_web',
      "updatedAt" = now()
    where id = p_source_id::bigint
      and company = v_company
      and assigned_staff_id = v_employee_code
      and status in ('confirmed', 'in_service')
    returning id::text into v_updated_id;
  else
    raise exception 'INVALID_SOURCE_TYPE' using errcode = '22023';
  end if;

  if v_updated_id is null then
    raise exception 'QUEUE_ITEM_CHANGED' using errcode = 'P0001';
  end if;

  return jsonb_build_object('success', true, 'source_id', v_updated_id);
exception
  when invalid_text_representation then
    raise exception 'INVALID_SOURCE_ID' using errcode = '22023';
end;
$$;

revoke all on function public.get_staff_queue_today() from public;
revoke all on function public.start_queue_item(text, text) from public;
revoke all on function public.complete_queue_item(text, text) from public;
revoke all on function public.cancel_queue_item(text, text) from public;

grant execute on function public.get_staff_queue_today() to authenticated;
grant execute on function public.start_queue_item(text, text) to authenticated;
grant execute on function public.complete_queue_item(text, text) to authenticated;
grant execute on function public.cancel_queue_item(text, text) to authenticated;

grant select on table public.staff_accounts to authenticated;
grant select on table public.employee to authenticated;
grant select on table public.chatbot_company_settings to authenticated;
grant select on table public.booking to authenticated;
grant select on table public.waiting_list to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking'
  ) then
    alter publication supabase_realtime add table public.booking;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'waiting_list'
  ) then
    alter publication supabase_realtime add table public.waiting_list;
  end if;
end;
$$;

commit;
