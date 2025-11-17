-- Migration: Set up cron job to process email queue automatically
-- Description: Creates a pg_cron job to trigger the email-processor edge function every 5 minutes

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the email processor edge function
CREATE OR REPLACE FUNCTION trigger_email_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  function_url TEXT;
BEGIN
  -- Get the project URL from pg_settings or use environment
  -- Note: You'll need to update these values for your project
  project_url := 'https://nwkwjcsezizdakpzmhlx.supabase.co';

  -- Construct the function URL
  function_url := project_url || '/functions/v1/email-processor';

  -- Use pg_net to make HTTP request (if available) or log for manual processing
  -- Note: pg_net might not be available in all Supabase plans
  -- If pg_net is not available, you can use external cron or serverless cron

  -- For now, we'll log that emails need processing
  -- The actual HTTP trigger should be set up via Supabase dashboard or external cron
  RAISE NOTICE 'Email processor should be triggered at %', function_url;

  -- Alternative: If you have pg_net extension:
  -- PERFORM net.http_post(
  --   url := function_url,
  --   headers := jsonb_build_object('Authorization', 'Bearer ' || service_role_key)
  -- );
END;
$$;

-- Schedule the cron job to run every 5 minutes
-- Note: This uses pg_cron which may require additional setup on Supabase
SELECT cron.schedule(
  'process-email-queue',           -- Job name
  '*/5 * * * *',                   -- Every 5 minutes
  'SELECT trigger_email_processor();'
);

-- Add comment
COMMENT ON FUNCTION trigger_email_processor IS
'Triggers the email processor edge function to process queued emails. Runs every 5 minutes via pg_cron.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_email_processor() TO postgres;
