-- Enable email notifications for all users (for testing)
-- This will ensure users receive challenge update emails

-- First, let's see current preferences
SELECT
  p.id,
  p.username,
  p.email,
  up.email_notifications_enabled,
  up.email_challenge_updates,
  up.email_daily_reminders,
  up.email_weekly_summaries,
  up.email_join_requests
FROM profiles p
LEFT JOIN user_preferences up ON up.user_id = p.id;

-- Enable email notifications for all existing users
-- Insert or update preferences to enable challenge updates
INSERT INTO user_preferences (
  user_id,
  email_notifications_enabled,
  email_challenge_updates,
  email_daily_reminders,
  email_weekly_summaries,
  email_join_requests
)
SELECT
  id as user_id,
  true as email_notifications_enabled,
  true as email_challenge_updates,
  false as email_daily_reminders,      -- Keep these off by default
  false as email_weekly_summaries,     -- Keep these off by default
  false as email_join_requests         -- Keep these off by default
FROM profiles
ON CONFLICT (user_id)
DO UPDATE SET
  email_notifications_enabled = true,
  email_challenge_updates = true,
  updated_at = NOW();

-- Verify the update
SELECT
  p.username,
  up.email_notifications_enabled,
  up.email_challenge_updates
FROM profiles p
LEFT JOIN user_preferences up ON up.user_id = p.id;
