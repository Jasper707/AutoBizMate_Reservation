-- AutoBizMate chatbot arrival verification and customer notes.
-- This migration is additive except for replacing get_staff_queue_today() with
-- the same visibility rules plus notes and arrival_verification_source.

begin;

create extension if not exists pgcrypto;

create table if not exists public.arrival_verification_questions (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  question_date date not null,
  question_json jsonb not null,
  hint_json jsonb not null default '{}'::jsonb,
  accepted_answers text[] not null,
  maximum_attempts integer not null default 3
    check (maximum_attempts between 1 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company, question_date)
);

comment on table public.arrival_verification_questions is
  'Daily localized arrival questions. accepted_answers is server-only.';
comment on column public.arrival_verification_questions.accepted_answers is
  'Server-only accepted answers. Never expose through browser or staff clients.';

alter table public.booking
  add column if not exists arrival_verified_at timestamptz,
  add column if not exists arrival_question_id uuid
    references public.arrival_verification_questions(id) on delete set null,
  add column if not exists arrival_verification_source text,
  add column if not exists notes_updated_at timestamptz;

alter table public.waiting_list
  add column if not exists arrived_at timestamptz,
  add column if not exists arrival_verified_at timestamptz,
  add column if not exists arrival_question_id uuid
    references public.arrival_verification_questions(id) on delete set null,
  add column if not exists arrival_verification_source text,
  add column if not exists notes text,
  add column if not exists notes_updated_at timestamptz;

create index if not exists arrival_questions_company_date_active_idx
  on public.arrival_verification_questions (company, question_date, is_active);
create index if not exists booking_arrival_lookup_idx
  on public.booking (company, chat_id, booking_date, status);
create index if not exists waiting_list_arrival_lookup_idx
  on public.waiting_list (company, chat_id, queue_date, status);

-- These verified natural keys contain no duplicates or nulls in the
-- pre-migration parity snapshot. The unique indexes make the existing
-- workflow upserts and the seeds below deterministic.
create unique index if not exists chatbot_company_settings_company_uidx
  on public.chatbot_company_settings (company);
create unique index if not exists chatbot_routes_route_uidx
  on public.chatbot_routes (
    company,
    source_workflow,
    source_step,
    choice_value
  );
create unique index if not exists bot_replies_reply_uidx
  on public.bot_replies (company, reply_key, language);
create unique index if not exists services_company_service_code_uidx
  on public.services (company, service_code);
create unique index if not exists employee_company_employee_code_uidx
  on public.employee (company, employee_code);
create unique index if not exists booking_company_booking_id_uidx
  on public.booking (company, booking_id);
create unique index if not exists waiting_list_company_reference_uidx
  on public.waiting_list (company, waiting_list_reference);
create unique index if not exists waiting_list_company_idempotency_uidx
  on public.waiting_list (company, idempotency_key);
create unique index if not exists admin_messages_message_id_uidx
  on public.admin_messages (message_id);
create unique index if not exists admin_messages_attempt_uidx
  on public.admin_messages (company, message_attempt_id);

update public.chatbot_company_settings
set
  queue_config_json = jsonb_set(
    jsonb_set(
      coalesce(queue_config_json, '{}'::jsonb),
      '{arrivalConfig}',
      jsonb_build_object(
        'scheduledWindowEnabled', false,
        'minutesBefore', null,
        'minutesAfter', null,
        'maxAttempts', 3
      ),
      true
    ),
    '{customerNoteConfig}',
    jsonb_build_object('maximumLength', 500),
    true
  ),
  "updatedAt" = now();

lock table public.chatbot_routes in share row exclusive mode;

insert into public.chatbot_routes (
  id,
  company,
  source_workflow,
  source_step,
  choice_value,
  destination_workflow,
  destination_step,
  subworkflow_route,
  reply_key,
  visibility_policy,
  guard_policy,
  label_key,
  blocked_reply_key,
  sort_order,
  is_active
)
select
  (
    select coalesce(max(existing.id), 0)
    from public.chatbot_routes existing
  ) + row_number() over (order by ccs.company),
  ccs.company,
  'main_menu',
  'select_feature',
  'arrival_check_in',
  'arrival_check_in',
  'show_question',
  'arrival_check_in',
  '',
  'has_arrival_eligible_commitment',
  'has_arrival_eligible_commitment',
  'main_menu.route.arrival_check_in',
  'arrival.no_eligible_commitment_with_menu',
  0,
  false
from public.chatbot_company_settings ccs
where coalesce(ccs.is_active, true)
on conflict (company, source_workflow, source_step, choice_value)
do update set
  destination_workflow = excluded.destination_workflow,
  destination_step = excluded.destination_step,
  subworkflow_route = excluded.subworkflow_route,
  visibility_policy = excluded.visibility_policy,
  guard_policy = excluded.guard_policy,
  label_key = excluded.label_key,
  blocked_reply_key = excluded.blocked_reply_key,
  sort_order = excluded.sort_order,
  is_active = false;

lock table public.bot_replies in share row exclusive mode;

with reply_seed(language, reply_key, message) as (
  values
    ('en', 'main_menu.route.arrival_check_in', 'I have arrived'),
    ('en', 'arrival.question', '${questionText}\n\nHint: ${hintText}'),
    ('en', 'arrival.incorrect_answer',
      'That answer is not correct. Please try again.\n\n${questionText}\n\nHint: ${hintText}'),
    ('en', 'arrival.confirmed_with_menu',
      'Your arrival for ${referenceId} is confirmed.\n${choicesText}'),
    ('en', 'arrival.maximum_attempts_with_menu',
      'The maximum number of attempts was reached. Your booking or waiting-list entry was not changed.\n${choicesText}'),
    ('en', 'arrival.no_eligible_commitment_with_menu',
      'There is no pending arrival-eligible booking or waiting-list entry for today.\n${choicesText}'),
    ('en', 'arrival.multiple_commitments_with_menu',
      'I found more than one eligible commitment and did not update anything. Please contact support.\n${choicesText}'),
    ('en', 'arrival.question_unavailable_with_menu',
      'Today''s arrival question is not available. Nothing was changed; please contact the salon for help.\n${choicesText}'),
    ('en', 'arrival.temporarily_unavailable_with_menu',
      'I cannot verify your arrival right now. Nothing was changed.\n${choicesText}'),
    ('en', 'arrival.unknown_step_with_menu',
      'The arrival check-in was reset safely. Nothing was changed.\n${choicesText}'),
    ('en', 'post_commitment_note.offer',
      'Would you like to add a note for ${referenceId}?\n${choicesText}'),
    ('en', 'post_commitment_note.enter',
      'Please type your note (up to ${maximumLength} characters).'),
    ('en', 'post_commitment_note.empty',
      'Please enter a note, or send X to return safely.'),
    ('en', 'post_commitment_note.too_long',
      'That note is too long. Please keep it to ${maximumLength} characters or fewer.'),
    ('en', 'post_commitment_note.save_failed',
      'The commitment was created, but I could not save the note. You can try again or skip.\n${choicesText}'),
    ('en', 'post_commitment_note.saved_with_menu',
      'Your note was saved.\n${choicesText}'),
    ('en', 'post_commitment_note.skipped_with_menu',
      'No note was added.\n${choicesText}'),
    ('en', 'post_commitment_note.unknown_step_with_menu',
      'The note step was reset safely; your booking or waiting-list entry is unchanged.\n${choicesText}'),
    ('tag', 'main_menu.route.arrival_check_in', 'Dumating na ako'),
    ('tag', 'arrival.question', '${questionText}\n\nPahiwatig: ${hintText}'),
    ('tag', 'arrival.incorrect_answer',
      'Hindi tama ang sagot. Subukan muli.\n\n${questionText}\n\nPahiwatig: ${hintText}'),
    ('tag', 'arrival.confirmed_with_menu',
      'Kumpirmado na ang pagdating mo para sa ${referenceId}.\n${choicesText}'),
    ('tag', 'arrival.maximum_attempts_with_menu',
      'Naabot na ang maximum na bilang ng pagsubok. Walang binago sa booking o waiting-list entry mo.\n${choicesText}'),
    ('tag', 'arrival.no_eligible_commitment_with_menu',
      'Walang pending na booking o waiting-list entry para sa pagdating ngayong araw.\n${choicesText}'),
    ('tag', 'arrival.multiple_commitments_with_menu',
      'Mahigit sa isang eligible commitment ang nakita ko kaya walang binago. Makipag-ugnayan sa support.\n${choicesText}'),
    ('tag', 'arrival.question_unavailable_with_menu',
      'Hindi available ang tanong para sa pagdating ngayong araw. Walang binago; makipag-ugnayan sa salon.\n${choicesText}'),
    ('tag', 'arrival.temporarily_unavailable_with_menu',
      'Hindi ko ma-verify ang pagdating mo ngayon. Walang binago.\n${choicesText}'),
    ('tag', 'arrival.unknown_step_with_menu',
      'Ligtas na ni-reset ang arrival check-in. Walang binago.\n${choicesText}'),
    ('tag', 'post_commitment_note.offer',
      'Gusto mo bang magdagdag ng note para sa ${referenceId}?\n${choicesText}'),
    ('tag', 'post_commitment_note.enter',
      'I-type ang note mo (hanggang ${maximumLength} character).'),
    ('tag', 'post_commitment_note.empty',
      'Maglagay ng note, o magpadala ng X para ligtas na bumalik.'),
    ('tag', 'post_commitment_note.too_long',
      'Masyadong mahaba ang note. Panatilihin ito sa ${maximumLength} character o mas kaunti.'),
    ('tag', 'post_commitment_note.save_failed',
      'Nagawa ang commitment pero hindi ko na-save ang note. Maaari mong subukan muli o laktawan.\n${choicesText}'),
    ('tag', 'post_commitment_note.saved_with_menu',
      'Na-save ang note mo.\n${choicesText}'),
    ('tag', 'post_commitment_note.skipped_with_menu',
      'Walang note na idinagdag.\n${choicesText}'),
    ('tag', 'post_commitment_note.unknown_step_with_menu',
      'Ligtas na ni-reset ang note step; hindi nabago ang booking o waiting-list entry mo.\n${choicesText}')
)
,
reply_rows as (
  select
    ccs.company,
    seed.reply_key,
    seed.language,
    seed.message,
    row_number() over (
      order by ccs.company, seed.language, seed.reply_key
    ) as new_row_number
  from public.chatbot_company_settings ccs
  cross join reply_seed seed
  where coalesce(ccs.is_active, true)
)
insert into public.bot_replies (
  id,
  company,
  reply_key,
  language,
  message,
  choices,
  choice_labels,
  is_number_choices,
  is_active
)
select
  (
    select coalesce(max(existing.id), 0)
    from public.bot_replies existing
  ) + reply_rows.new_row_number,
  reply_rows.company,
  reply_rows.reply_key,
  reply_rows.language,
  reply_rows.message,
  '',
  '',
  false,
  true
from reply_rows
on conflict (company, reply_key, language)
do update set
  message = excluded.message,
  choices = excluded.choices,
  choice_labels = excluded.choice_labels,
  is_number_choices = excluded.is_number_choices,
  is_active = excluded.is_active;

drop trigger if exists arrival_questions_touch_updated_at
  on public.arrival_verification_questions;
create trigger arrival_questions_touch_updated_at
before update on public.arrival_verification_questions
for each row execute function public.autobizmate_touch_updated_at();

alter table public.arrival_verification_questions enable row level security;

revoke all on table public.arrival_verification_questions from public;
revoke all on table public.arrival_verification_questions from anon;
revoke all on table public.arrival_verification_questions from authenticated;

create or replace function public.autobizmate_normalize_arrival_answer(
  p_value text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(
    trim(
      regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g')
    )
  );
$$;

create or replace function public.get_arrival_question(
  p_company text,
  p_chat_id text,
  p_language text
)
returns table (
  result_code text,
  question_id uuid,
  question_date date,
  question_text text,
  hint_text text,
  maximum_attempts integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_eligible_count integer;
  v_language text;
begin
  if nullif(trim(p_company), '') is null
     or nullif(trim(p_chat_id), '') is null then
    return query
    select 'invalid_request'::text, null::uuid, null::date,
      null::text, null::text, null::integer;
    return;
  end if;

  select coalesce(nullif(ccs.timezone, ''), 'Asia/Manila')
  into v_timezone
  from public.chatbot_company_settings ccs
  where ccs.company = p_company
    and coalesce(ccs.is_active, true)
  limit 1;

  if v_timezone is null then
    return query
    select 'configuration_unavailable'::text, null::uuid, null::date,
      null::text, null::text, null::integer;
    return;
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_language := case
    when lower(trim(coalesce(p_language, ''))) in ('tag', 'tl', 'fil')
      then 'tag'
    else 'en'
  end;

  select count(*)::integer
  into v_eligible_count
  from (
    select b.id
    from public.booking b
    where b.company = p_company
      and b.chat_id = p_chat_id
      and public.autobizmate_try_date(b.booking_date) = v_today
      and lower(coalesce(b.status, '')) = 'pending'
    union all
    select w.id
    from public.waiting_list w
    where w.company = p_company
      and w.chat_id = p_chat_id
      and public.autobizmate_try_date(w.queue_date) = v_today
      and lower(coalesce(w.status, '')) = 'pending'
  ) eligible;

  if v_eligible_count = 0 then
    return query
    select 'no_eligible_commitment'::text, null::uuid, v_today,
      null::text, null::text, null::integer;
    return;
  end if;

  if v_eligible_count > 1 then
    return query
    select 'multiple_eligible_commitments'::text, null::uuid, v_today,
      null::text, null::text, null::integer;
    return;
  end if;

  return query
  select
    'ok'::text,
    q.id,
    q.question_date,
    coalesce(
      nullif(q.question_json ->> v_language, ''),
      nullif(q.question_json ->> 'en', '')
    ),
    coalesce(
      nullif(q.hint_json ->> v_language, ''),
      nullif(q.hint_json ->> 'en', '')
    ),
    q.maximum_attempts
  from public.arrival_verification_questions q
  where q.company = p_company
    and q.question_date = v_today
    and q.is_active
  limit 1;

  if not found then
    return query
    select 'question_unavailable'::text, null::uuid, v_today,
      null::text, null::text, null::integer;
  end if;
end;
$$;

create or replace function public.verify_customer_arrival(
  p_company text,
  p_chat_id text,
  p_question_id uuid,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_answers text[];
  v_booking_count integer := 0;
  v_waiting_count integer := 0;
  v_total_count integer := 0;
  v_normalized_answer text;
  v_is_correct boolean := false;
  v_reference text;
begin
  if nullif(trim(p_company), '') is null
     or nullif(trim(p_chat_id), '') is null
     or p_question_id is null then
    return jsonb_build_object('resultCode', 'invalid_request');
  end if;

  select coalesce(nullif(ccs.timezone, ''), 'Asia/Manila')
  into v_timezone
  from public.chatbot_company_settings ccs
  where ccs.company = p_company
    and coalesce(ccs.is_active, true)
  limit 1;

  if v_timezone is null then
    return jsonb_build_object('resultCode', 'configuration_unavailable');
  end if;

  v_today := (now() at time zone v_timezone)::date;

  select q.accepted_answers
  into v_answers
  from public.arrival_verification_questions q
  where q.id = p_question_id
    and q.company = p_company
    and q.question_date = v_today
    and q.is_active
  for update;

  if v_answers is null then
    return jsonb_build_object('resultCode', 'question_unavailable');
  end if;

  perform 1
  from public.booking b
  where b.company = p_company
    and b.chat_id = p_chat_id
    and public.autobizmate_try_date(b.booking_date) = v_today
    and lower(coalesce(b.status, '')) = 'pending'
  for update;

  get diagnostics v_booking_count = row_count;

  perform 1
  from public.waiting_list w
  where w.company = p_company
    and w.chat_id = p_chat_id
    and public.autobizmate_try_date(w.queue_date) = v_today
    and lower(coalesce(w.status, '')) = 'pending'
  for update;

  get diagnostics v_waiting_count = row_count;
  v_total_count := v_booking_count + v_waiting_count;

  if v_total_count = 0 then
    return jsonb_build_object('resultCode', 'no_eligible_commitment');
  end if;

  if v_total_count > 1 then
    return jsonb_build_object('resultCode', 'multiple_eligible_commitments');
  end if;

  v_normalized_answer :=
    public.autobizmate_normalize_arrival_answer(p_answer);

  select exists (
    select 1
    from unnest(v_answers) accepted(answer)
    where public.autobizmate_normalize_arrival_answer(accepted.answer)
      = v_normalized_answer
  )
  into v_is_correct;

  if not v_is_correct then
    return jsonb_build_object('resultCode', 'incorrect_answer');
  end if;

  if v_booking_count = 1 then
    update public.booking b
    set
      status = 'confirmed',
      arrived_at = now(),
      arrival_verified_at = now(),
      arrival_question_id = p_question_id,
      arrival_verification_source = 'chatbot_daily_question',
      "updatedAt" = now()
    where b.company = p_company
      and b.chat_id = p_chat_id
      and public.autobizmate_try_date(b.booking_date) = v_today
      and lower(coalesce(b.status, '')) = 'pending'
    returning coalesce(nullif(b.booking_id, ''), b.id::text)
      into v_reference;

    if v_reference is null then
      return jsonb_build_object('resultCode', 'commitment_changed');
    end if;

    return jsonb_build_object(
      'resultCode', 'confirmed',
      'targetType', 'booking',
      'referenceId', v_reference
    );
  end if;

  update public.waiting_list w
  set
    status = 'confirmed',
    confirmed_at = now()::text,
    arrived_at = now(),
    arrival_verified_at = now(),
    arrival_question_id = p_question_id,
    arrival_verification_source = 'chatbot_daily_question',
    "updatedAt" = now()
  where w.company = p_company
    and w.chat_id = p_chat_id
    and public.autobizmate_try_date(w.queue_date) = v_today
    and lower(coalesce(w.status, '')) = 'pending'
  returning coalesce(nullif(w.waiting_list_reference, ''), w.id::text)
    into v_reference;

  if v_reference is null then
    return jsonb_build_object('resultCode', 'commitment_changed');
  end if;

  return jsonb_build_object(
    'resultCode', 'confirmed',
    'targetType', 'waiting_list',
    'referenceId', v_reference
  );
end;
$$;

-- PostgreSQL cannot change a table-returning function's row type with
-- CREATE OR REPLACE, so drop and recreate this RPC inside the transaction.
drop function if exists public.get_staff_queue_today();

create function public.get_staff_queue_today()
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
  notes text,
  arrival_verification_source text,
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
      ccs.queue_config_json #>>
        '{staffDashboardConfig,scheduledArrivalWindowMinutesBefore}',
      0
    ),
    public.autobizmate_safe_nonnegative_int(
      ccs.queue_config_json #>>
        '{staffDashboardConfig,scheduledArrivalWindowMinutesAfter}',
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
      coalesce(nullif(s.service_name, ''), nullif(b.service_code, ''))
        as service_name,
      public.autobizmate_try_date(b.booking_date) as queue_date,
      public.autobizmate_try_date(b.booking_date) as scheduled_date,
      public.autobizmate_try_time(b.start_time) as scheduled_start_time,
      b."createdAt" as joined_at,
      b.arrived_at,
      b.service_started_at,
      b.status,
      b.notes,
      b.arrival_verification_source,
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
      coalesce(nullif(w.waiting_list_reference, ''), w.id::text)
        as reference_id,
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
        w.arrived_at,
        public.autobizmate_try_timestamptz(w.confirmed_at),
        w.joined_at
      ) as arrived_at,
      public.autobizmate_try_timestamptz(w.service_started_at)
        as service_started_at,
      w.status,
      w.notes,
      w.arrival_verification_source,
      row_number() over (
        order by
          coalesce(
            w.arrived_at,
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
          w.arrived_at,
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

revoke all on function public.autobizmate_normalize_arrival_answer(text)
  from public;
revoke all on function public.get_arrival_question(text, text, text)
  from public;
revoke all on function public.verify_customer_arrival(text, text, uuid, text)
  from public;
revoke all on function public.get_staff_queue_today() from public;

grant execute on function public.get_arrival_question(text, text, text)
  to service_role;
grant execute on function public.verify_customer_arrival(text, text, uuid, text)
  to service_role;
grant execute on function public.get_staff_queue_today() to authenticated;

commit;
