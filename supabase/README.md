# AutoBizMate Supabase setup

Apply migrations in timestamp order to the existing AutoBizMate Supabase project.

The staff queue migration:

- preserves the existing operational tables;
- adds `staff_accounts` for Auth-to-employee authorization;
- adds lifecycle audit columns missing from `booking` and `waiting_list`;
- enables Row Level Security for staff-facing data;
- adds the canonical `get_staff_queue_today()` queue RPC;
- adds authorized start, complete, and cancel RPCs;
- enables Realtime publication for `booking` and `waiting_list`;
- stores the exact schedule rule in each company’s `queue_config_json`.

After applying the migration, create a Supabase Auth user and add one matching
`staff_accounts` row for each active employee who should access `/staff`. Do not
store staff passwords in application tables.
