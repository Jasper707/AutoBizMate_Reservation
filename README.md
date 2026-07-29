# AutoBizMate

AutoBizMate is a responsive React and TypeScript web app for managing one live
service queue made from scheduled bookings and same-day walk-ins.

## Included

- Public Home and About pages
- Accessible light and dark themes with saved preference
- Supabase email/password staff authentication
- Company-scoped staff authorization through `staff_accounts`
- A protected, realtime staff queue
- Start, complete, and cancel actions with audit fields
- Exact scheduled-arrival handling: `0` minutes before and `0` minutes after.
  A 9:00 AM booking is actionable only during the 09:00 minute.
- Responsive layouts, empty/loading/error states, confirmation dialogs, and
  toast feedback

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

The publishable browser key is expected in the frontend. Never place a Supabase
service-role key in a Vite environment variable.

## Staff access

Create a user in Supabase Authentication, make sure the matching employee exists
in `employee`, then add a company membership in `staff_accounts` using that
user's Auth UUID and employee code. Row-level security limits each staff member
to their company.

## Commands

```bash
npm run lint
npm run test
npm run build
npm run preview
```

The production build emits static assets to `dist/client` and the Sites worker
entry to `dist/server/index.js`.

## Database

The database migration is stored in
`supabase/migrations/20260729120000_staff_queue.sql`. It adds staff membership,
queue lifecycle fields, RLS policies, realtime coverage, and the queue RPCs used
by the app.

The About page's customer story and founder details intentionally remain clearly
marked placeholders until approved business copy is available.
