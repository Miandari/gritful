-- Check the email queue status
-- Use this to see if emails were queued and their status

-- 1. View all queued emails
SELECT
  id,
  email_type,
  recipient_email,
  subject,
  status,
  retry_count,
  error_message,
  scheduled_for,
  sent_at,
  created_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count emails by status
SELECT
  status,
  COUNT(*) as count
FROM email_queue
GROUP BY status;

-- 3. View pending emails that need to be sent
SELECT
  id,
  email_type,
  recipient_email,
  subject,
  scheduled_for,
  retry_count
FROM email_queue
WHERE status = 'pending'
  AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC;

-- 4. View failed emails
SELECT
  id,
  email_type,
  recipient_email,
  subject,
  error_message,
  retry_count,
  failed_at
FROM email_queue
WHERE status = 'failed'
ORDER BY failed_at DESC;
