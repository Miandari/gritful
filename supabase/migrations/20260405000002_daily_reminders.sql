-- Phase 4a: Daily Reminder System
-- Apply via Supabase Dashboard > SQL Editor

-- Function: Check if a user has any pending (incomplete) tasks across all frequencies
-- Returns true if the user should be reminded
CREATE OR REPLACE FUNCTION public.user_has_pending_tasks(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  has_pending BOOLEAN := false;
  rec RECORD;
BEGIN
  -- Loop through user's active challenge participations
  FOR rec IN
    SELECT
      cp.id AS participant_id,
      c.metrics,
      c.starts_at,
      c.ends_at,
      c.grace_period_days
    FROM challenge_participants cp
    JOIN challenges c ON c.id = cp.challenge_id
    WHERE cp.user_id = p_user_id
      AND cp.status = 'active'
      AND c.starts_at <= CURRENT_DATE
      AND (c.ends_at IS NULL OR CURRENT_DATE <= c.ends_at + make_interval(days => COALESCE(c.grace_period_days, 7)))
  LOOP
    -- Check 1: Daily tasks -- is there a completed entry for today?
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(rec.metrics) m
      WHERE m->>'frequency' = 'daily'
    ) THEN
      -- No entry at all, or entry not completed
      IF NOT EXISTS (
        SELECT 1 FROM daily_entries
        WHERE participant_id = rec.participant_id
          AND entry_date = CURRENT_DATE
          AND is_completed = true
      ) THEN
        RETURN true;
      END IF;
    END IF;

    -- Check 2: Weekly tasks -- any incomplete for this week?
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(rec.metrics) m
      WHERE m->>'frequency' = 'weekly'
    ) THEN
      -- Check each weekly task
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(rec.metrics) m
        WHERE m->>'frequency' = 'weekly'
          AND NOT EXISTS (
            SELECT 1 FROM periodic_task_completions ptc
            WHERE ptc.participant_id = rec.participant_id
              AND ptc.task_id = m->>'id'
              AND ptc.period_start = date_trunc('week', CURRENT_DATE)::date
          )
      ) THEN
        RETURN true;
      END IF;
    END IF;

    -- Check 3: Monthly tasks -- any incomplete for this month?
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(rec.metrics) m
      WHERE m->>'frequency' = 'monthly'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(rec.metrics) m
        WHERE m->>'frequency' = 'monthly'
          AND NOT EXISTS (
            SELECT 1 FROM periodic_task_completions ptc
            WHERE ptc.participant_id = rec.participant_id
              AND ptc.task_id = m->>'id'
              AND ptc.period_start = date_trunc('month', CURRENT_DATE)::date
          )
      ) THEN
        RETURN true;
      END IF;
    END IF;

    -- Check 4: One-time tasks with upcoming deadline
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(rec.metrics) m
      WHERE m->>'frequency' = 'onetime'
        AND m->>'deadline' IS NOT NULL
        AND (m->>'deadline')::date >= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM onetime_task_completions otc
          WHERE otc.participant_id = rec.participant_id
            AND otc.task_id = m->>'id'
        )
    ) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- Store secrets in Supabase Vault for pg_cron to use
-- Run these separately ONCE (replace with your actual values):
--
--   SELECT vault.create_secret('service_role_key', 'your-service-role-key-here');
--   SELECT vault.create_secret('supabase_url', 'https://nwkwjcsezizdakpzmhlx.supabase.co');

-- pg_cron job: runs every 15 minutes, finds users due for a reminder
-- who have pending tasks, and sends push notifications
SELECT cron.schedule(
  'daily-task-reminders',
  '*/15 * * * *',
  $$
  DO $body$
  DECLARE
    u RECORD;
    supabase_url TEXT;
    service_key TEXT;
  BEGIN
    -- Read secrets from vault
    SELECT decrypted_secret INTO service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    SELECT decrypted_secret INTO supabase_url
      FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;

    IF service_key IS NULL OR supabase_url IS NULL THEN
      RAISE NOTICE 'Reminder cron: vault secrets not configured (service_role_key, supabase_url)';
      RETURN;
    END IF;

    FOR u IN
      SELECT DISTINCT up.user_id
      FROM user_preferences up
      WHERE up.push_reminders = true
        AND up.reminder_time IS NOT NULL
        AND up.reminder_timezone IS NOT NULL
        -- Check if current time in user's timezone falls within this 15-min window
        AND (NOW() AT TIME ZONE up.reminder_timezone)::time
            BETWEEN up.reminder_time
            AND up.reminder_time + interval '14 minutes'
        -- User has push subscriptions
        AND EXISTS (
          SELECT 1 FROM push_subscriptions ps
          WHERE ps.user_id = up.user_id
        )
        -- User actually has pending tasks
        AND user_has_pending_tasks(up.user_id)
    LOOP
      -- Fire-and-forget push notification (net.http_post is async)
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', u.user_id,
          'title', 'Time to log your progress',
          'body', 'You have unfinished tasks waiting for you',
          'url', '/dashboard/today'
        )
      );
    END LOOP;
  END;
  $body$;
  $$
);
