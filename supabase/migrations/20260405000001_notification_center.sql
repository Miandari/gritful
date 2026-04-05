-- Phase 3a: Notification Center Schema Updates
-- Apply via Supabase Dashboard > SQL Editor

-- 1. Expand notification types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS valid_notification_type;

ALTER TABLE public.notifications
  ADD CONSTRAINT valid_notification_type CHECK (type IN (
    -- Social (existing)
    'join_request', 'join_approved', 'join_rejected',
    'challenge_invite', 'challenge_update',
    'participant_joined',
    -- Personal
    'streak_milestone', 'points_milestone',
    -- Leaderboard
    'leaderboard_overtake',
    -- System
    'system'
  ));

-- 2. Add category column for filtering
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'social'
  CONSTRAINT valid_category CHECK (category IN ('personal', 'social', 'leaderboard', 'system'));

-- 3. Add index for category-filtered queries
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications(user_id, category, created_at DESC);

-- 4. Expand user_preferences with per-category push toggles and reminder settings
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS push_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_milestones BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_challenge_activity BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_leaderboard BOOLEAN DEFAULT true,
  -- Future email toggles (schema-ready, not wired up yet)
  ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_milestones BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_challenge_activity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_leaderboard BOOLEAN DEFAULT false,
  -- Reminder settings
  ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS reminder_timezone TEXT DEFAULT 'UTC';

-- 5. Auto-archive: hard-delete read social/leaderboard notifications older than 90 days
-- Personal milestones are kept indefinitely (sentimental value)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$DELETE FROM public.notifications
    WHERE read = true
    AND category IN ('social', 'leaderboard')
    AND created_at < NOW() - INTERVAL '90 days'$$
);
