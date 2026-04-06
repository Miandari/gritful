-- Fix: pg_net can't call Edge Functions on the same Supabase project (DNS/routing issue).
-- Solution: Move reminder logic into a self-contained Edge Function (process-reminders)
-- that queries the DB and sends pushes directly. pg_cron just triggers it via pg_net
-- to an external-accessible URL, OR we use this RPC function called by the Edge Function.

-- RPC function: returns users eligible for a reminder right now
CREATE OR REPLACE FUNCTION public.get_reminder_eligible_users()
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT up.user_id
  FROM user_preferences up
  WHERE up.push_reminders = true
    AND up.reminder_time IS NOT NULL
    AND up.reminder_timezone IS NOT NULL
    -- Current time in user's timezone falls within this 15-min window
    AND (NOW() AT TIME ZONE up.reminder_timezone)::time
        BETWEEN up.reminder_time
        AND up.reminder_time + interval '14 minutes'
    -- User has push subscriptions
    AND EXISTS (
      SELECT 1 FROM push_subscriptions ps
      WHERE ps.user_id = up.user_id
    )
    -- User has incomplete tasks
    AND user_has_pending_tasks(up.user_id);
END;
$$;

-- Grant execute permission to service role (Edge Functions use service role)
GRANT EXECUTE ON FUNCTION public.get_reminder_eligible_users() TO service_role;

-- Remove the old cron job that tried to use pg_net to call Edge Functions
SELECT cron.unschedule('daily-task-reminders');

-- New cron job: calls process-reminders Edge Function via Supabase's
-- internal edge runtime. We use a simple HTTP GET to trigger it.
-- The Edge Function handles all the logic (query + push).
--
-- NOTE: If pg_net still can't reach the Edge Function internally,
-- use an external cron service (e.g., cron-job.org, GitHub Actions)
-- to call: POST https://nwkwjcsezizdakpzmhlx.supabase.co/functions/v1/process-reminders
-- with Authorization: Bearer <service_role_key>
