# Email System Migration Status

## Summary
All necessary email system migrations are now in the `/supabase/migrations/` folder.

## Email System Migrations (in order):

1. **20250115000001_email_system_setup.sql** ✅
   - Creates `email_queue` table
   - Creates `email_unsubscribe_tokens` table
   - Creates helper functions: `generate_unsubscribe_token()`, `process_unsubscribe()`, `cleanup_email_system()`
   - Sets up RLS policies
   - **Fixed:** Removed `now()` from index predicate (was causing immutable function error)

2. **20250130000001_email_retrieval_function.sql** ✅
   - Creates `get_user_emails_for_challenge_update()` RPC function
   - Securely retrieves emails from auth.users table
   - Respects user email preferences
   - Only returns confirmed emails

3. **20250130000003_email_queue_rls_fix.sql** ✅
   - Adds RLS policy to allow authenticated users to insert into email_queue
   - Required for challenge creators to send updates via sendChallengeUpdate action

## Migrations Already Applied to Production:
These were run manually in Supabase SQL Editor and are already in your production database:
- ✅ Email system setup (with fixed index)
- ✅ Email retrieval function
- ✅ RLS policy fix

## For New Environments:
If you need to set up a fresh database, run migrations in this order:
```bash
# All migrations will run in order automatically
supabase db reset  # Local only - NEVER in production!
# OR
supabase db push   # Push to remote
```

## Notes:
- The `20250130000002_email_processor_cron.sql` file exists but pg_cron may not be enabled on Supabase by default
- Email preferences updates (enabling notifications for users) are data changes, not schema changes, so they don't need migrations
- Always use `supabase db push` for production, never `db reset` (per CLAUDE.md)
