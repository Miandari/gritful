-- =====================================================
-- EMAIL SYSTEM SETUP
-- =====================================================
-- Migration to set up email notification infrastructure
-- Strategy: Conservative defaults - only challenge updates enabled

-- =====================================================
-- PART 1: Update User Preferences Defaults
-- =====================================================
-- Change defaults to be more conservative (opt-in approach)

-- Update default values for email preferences
ALTER TABLE public.user_preferences
  ALTER COLUMN email_daily_reminder SET DEFAULT false,
  ALTER COLUMN email_join_requests SET DEFAULT false,
  ALTER COLUMN email_weekly_summary SET DEFAULT false;
-- email_challenge_updates remains DEFAULT true (most valuable notification)

-- Update existing users to match new conservative defaults
UPDATE public.user_preferences
SET
  email_daily_reminder = false,
  email_join_requests = false,
  email_weekly_summary = false
WHERE
  -- Only update if they haven't explicitly changed settings
  -- (Assuming users with created_at = updated_at haven't changed settings yet)
  created_at = updated_at;
-- email_challenge_updates stays enabled for existing users

-- =====================================================
-- PART 2: Email Queue Table
-- =====================================================
-- Queue for reliable email delivery with retry logic

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email details
  email_type TEXT NOT NULL CHECK (email_type IN (
    'daily_reminder',
    'weekly_summary',
    'join_request',
    'challenge_update'
  )),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Template info
  template_name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',

  -- Queue management
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'sent',
    'failed'
  )),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status
  ON public.email_queue(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_user
  ON public.email_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_type
  ON public.email_queue(email_type);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Users can only view their own queued emails
CREATE POLICY "Users can view own queued emails"
  ON public.email_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert/update/delete emails
CREATE POLICY "Service role can manage email queue"
  ON public.email_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PART 3: Unsubscribe Tokens Table
-- =====================================================
-- Secure tokens for one-click unsubscribe (GDPR compliance)

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token details
  token TEXT NOT NULL UNIQUE,
  email_type TEXT CHECK (email_type IN (
    'daily_reminder',
    'weekly_summary',
    'join_request',
    'challenge_update',
    'all'  -- Unsubscribe from everything
  )),

  -- Optional: specific challenge (for challenge_update unsubscribe)
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,

  -- Track usage
  used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days')
);

-- Index for fast token lookup
-- Note: Removed 'expires_at > now()' from predicate because now() is not immutable
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token
  ON public.email_unsubscribe_tokens(token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_user
  ON public.email_unsubscribe_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can use unsubscribe tokens (even logged out)
CREATE POLICY "Anyone can use unsubscribe tokens"
  ON public.email_unsubscribe_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can create tokens
CREATE POLICY "Service role can create tokens"
  ON public.email_unsubscribe_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update tokens (mark as used)
CREATE POLICY "Service role can update tokens"
  ON public.email_unsubscribe_tokens FOR UPDATE
  TO service_role
  USING (true);

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Function to generate secure unsubscribe token
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token(
  p_user_id UUID,
  p_email_type TEXT DEFAULT NULL,
  p_challenge_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate a random UUID as token
  v_token := gen_random_uuid()::TEXT;

  -- Insert token
  INSERT INTO public.email_unsubscribe_tokens (
    user_id,
    token,
    email_type,
    challenge_id
  ) VALUES (
    p_user_id,
    v_token,
    p_email_type,
    p_challenge_id
  );

  RETURN v_token;
END;
$$;

-- Function to process unsubscribe request
CREATE OR REPLACE FUNCTION public.process_unsubscribe(p_token TEXT)
RETURNS TABLE (
  success BOOLEAN,
  user_id UUID,
  email_type TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Get token details
  SELECT * INTO v_token_record
  FROM public.email_unsubscribe_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  -- Check if token exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired unsubscribe link'::TEXT;
    RETURN;
  END IF;

  -- Mark token as used
  UPDATE public.email_unsubscribe_tokens
  SET used_at = now()
  WHERE token = p_token;

  -- Update user preferences
  IF v_token_record.email_type = 'all' OR v_token_record.email_type IS NULL THEN
    -- Unsubscribe from everything
    UPDATE public.user_preferences
    SET
      email_daily_reminder = false,
      email_weekly_summary = false,
      email_join_requests = false,
      email_challenge_updates = false,
      email_notifications_enabled = false
    WHERE user_id = v_token_record.user_id;

    RETURN QUERY SELECT true, v_token_record.user_id, 'all'::TEXT, 'You have been unsubscribed from all emails'::TEXT;
  ELSE
    -- Unsubscribe from specific type
    CASE v_token_record.email_type
      WHEN 'daily_reminder' THEN
        UPDATE public.user_preferences SET email_daily_reminder = false WHERE user_id = v_token_record.user_id;
      WHEN 'weekly_summary' THEN
        UPDATE public.user_preferences SET email_weekly_summary = false WHERE user_id = v_token_record.user_id;
      WHEN 'join_request' THEN
        UPDATE public.user_preferences SET email_join_requests = false WHERE user_id = v_token_record.user_id;
      WHEN 'challenge_update' THEN
        UPDATE public.user_preferences SET email_challenge_updates = false WHERE user_id = v_token_record.user_id;
    END CASE;

    RETURN QUERY SELECT
      true,
      v_token_record.user_id,
      v_token_record.email_type,
      'You have been unsubscribed from ' || v_token_record.email_type || ' emails'::TEXT;
  END IF;
END;
$$;

-- =====================================================
-- PART 5: Cleanup Function
-- =====================================================
-- Function to clean up old/expired queue items and tokens

CREATE OR REPLACE FUNCTION public.cleanup_email_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete old sent emails (keep for 30 days)
  DELETE FROM public.email_queue
  WHERE status = 'sent'
    AND sent_at < (now() - INTERVAL '30 days');

  -- Delete old failed emails (keep for 7 days)
  DELETE FROM public.email_queue
  WHERE status = 'failed'
    AND failed_at < (now() - INTERVAL '7 days');

  -- Delete expired unsubscribe tokens
  DELETE FROM public.email_unsubscribe_tokens
  WHERE expires_at < now();

  -- Delete used tokens older than 90 days
  DELETE FROM public.email_unsubscribe_tokens
  WHERE used_at IS NOT NULL
    AND used_at < (now() - INTERVAL '90 days');
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.email_queue IS 'Queue for reliable email delivery with retry logic';
COMMENT ON TABLE public.email_unsubscribe_tokens IS 'Secure tokens for one-click unsubscribe (GDPR compliance)';
COMMENT ON FUNCTION public.generate_unsubscribe_token IS 'Generates a secure unsubscribe token for a user';
COMMENT ON FUNCTION public.process_unsubscribe IS 'Processes an unsubscribe request and updates user preferences';
COMMENT ON FUNCTION public.cleanup_email_system IS 'Cleans up old email queue items and expired tokens';
