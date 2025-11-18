-- =====================================================
-- SETUP CRON JOB FOR EMAIL QUEUE PROCESSING
-- =====================================================
-- This migration sets up a pg_cron job to call the Edge Function
-- Strategy: Non-aggressive - runs every 5 minutes

-- NOTE: pg_cron is enabled by default in Supabase
-- We use pg_net extension to make HTTP requests to our Edge Function

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that calls the Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.trigger_email_queue_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id BIGINT;
  v_function_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get environment variables (these should be set in Supabase Dashboard)
  -- For production: https://[your-project].supabase.co/functions/v1/process-email-queue
  -- For local: http://127.0.0.1:54321/functions/v1/process-email-queue
  v_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-email-queue';
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback if settings aren't configured
  IF v_function_url IS NULL OR v_function_url = '' THEN
    -- This will need to be updated with your actual project URL
    v_function_url := 'https://mglggcokutytmmngblej.supabase.co/functions/v1/process-email-queue';
  END IF;

  -- Make async HTTP POST request to Edge Function
  SELECT net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_service_role_key, current_setting('app.settings.service_role_key', true))
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  -- Log the request
  RAISE NOTICE 'Email queue processing triggered at % with request_id %', now(), v_request_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail (cron will retry next time)
    RAISE WARNING 'Failed to trigger email queue processing: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_email_queue_processing() TO postgres;

COMMENT ON FUNCTION public.trigger_email_queue_processing IS 'Calls the process-email-queue Edge Function via HTTP to process pending emails';

-- =====================================================
-- IMPORTANT SETUP INSTRUCTIONS
-- =====================================================
--
-- After running this migration, you need to set up the cron job manually
-- in the Supabase Dashboard because CREATE EXTENSION pg_cron requires
-- superuser privileges.
--
-- Steps:
-- 1. Go to Supabase Dashboard → Database → Cron Jobs
-- 2. Click "Create a new cron job"
-- 3. Name: process-email-queue
-- 4. Schedule: */5 * * * * (every 5 minutes)
-- 5. Command: SELECT public.trigger_email_queue_processing();
--
-- Also create a cleanup job:
-- 1. Name: cleanup-email-system
-- 2. Schedule: 0 2 * * * (daily at 2 AM)
-- 3. Command: SELECT public.cleanup_email_system();
--
-- Alternatively, use SQL (requires superuser):
-- SELECT cron.schedule('process-email-queue', '*/5 * * * *', 'SELECT public.trigger_email_queue_processing();');
-- SELECT cron.schedule('cleanup-email-system', '0 2 * * *', 'SELECT public.cleanup_email_system();');
--
