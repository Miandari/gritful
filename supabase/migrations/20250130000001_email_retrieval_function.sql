-- Migration: Email Retrieval Function for Challenge Updates
-- Description: Creates a secure RPC function to retrieve user emails for email notifications
-- This function uses SECURITY DEFINER to access auth.users table securely

-- Create function to get user emails for challenge updates
-- This function respects user email preferences
CREATE OR REPLACE FUNCTION get_user_emails_for_challenge_update(
  p_user_ids UUID[],
  p_challenge_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  username TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Allows function to access auth.users
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    au.email::TEXT as email,
    p.username,
    p.full_name
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.id
  LEFT JOIN user_preferences up ON up.user_id = p.id
  WHERE
    p.id = ANY(p_user_ids)
    AND au.email IS NOT NULL
    AND au.email_confirmed_at IS NOT NULL -- Only send to confirmed emails
    AND (up.email_notifications_enabled IS NULL OR up.email_notifications_enabled = true)
    AND (up.email_challenge_updates IS NULL OR up.email_challenge_updates = true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails_for_challenge_update(UUID[], UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_emails_for_challenge_update IS
'Securely retrieves email addresses for users who have opted in to challenge update emails. Only returns confirmed emails for users who have notifications enabled.';
