# Email Queue Processor Edge Function

This Edge Function processes pending emails from the `email_queue` table and sends them via Resend.

## Features

- **Non-aggressive**: Processes only 10 emails per batch
- **Retry logic**: Automatically retries failed emails up to 3 times with exponential backoff
- **Scheduled execution**: Runs every 5 minutes via pg_cron
- **Error handling**: Marks emails as failed after max retries

## Setup

### 1. Deploy the Edge Function

```bash
# Deploy to Supabase
npx supabase functions deploy process-email-queue

# Or deploy all functions
npx supabase functions deploy
```

### 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → process-email-queue → Settings:

- `RESEND_API_KEY`: Your Resend API key
- `APP_URL`: Your app URL (e.g., https://www.gritful.app)
- `SUPABASE_URL`: Auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-set by Supabase

### 3. Run the Migration

The migration (`20251118000003_setup_email_queue_cron.sql`) creates the necessary trigger function.

```bash
# Push migration to remote
npx supabase db push
```

### 4. Set Up Cron Job

#### Option A: Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard → Database → Cron Jobs**
2. Click **"Create a new cron job"**
3. Configure:
   - **Name**: `process-email-queue`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Command**: `SELECT public.trigger_email_queue_processing();`
4. Click **Create**

Also create a cleanup job:
- **Name**: `cleanup-email-system`
- **Schedule**: `0 2 * * *` (daily at 2 AM)
- **Command**: `SELECT public.cleanup_email_system();`

#### Option B: SQL (If you have superuser access)

```sql
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  'SELECT public.trigger_email_queue_processing();'
);

SELECT cron.schedule(
  'cleanup-email-system',
  '0 2 * * *',
  'SELECT public.cleanup_email_system();'
);
```

## How It Works

1. **pg_cron** runs `trigger_email_queue_processing()` every 5 minutes
2. The function calls this Edge Function via HTTP (using `pg_net`)
3. Edge Function queries `email_queue` for pending emails (oldest first, limit 10)
4. For each email:
   - Marks as `processing`
   - Sends via Resend API
   - On success: marks as `sent`
   - On failure:
     - If retries remain: schedules retry with exponential backoff (5min, 15min, 45min)
     - If max retries reached: marks as `failed`

## Monitoring

### View Cron Jobs

```sql
SELECT * FROM cron.job;
```

### View Cron Job History

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Check Email Queue Status

```sql
-- View all pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- View failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- View recently sent emails
SELECT * FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 20;
```

### Manual Testing

Call the Edge Function directly:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/process-email-queue' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

Or trigger the SQL function:

```sql
SELECT public.trigger_email_queue_processing();
```

## Retry Strategy

- **Retry 1**: 5 minutes after failure
- **Retry 2**: 15 minutes after second failure
- **Retry 3**: 45 minutes after third failure
- After 3 failures, email is marked as `failed` permanently

## Cleanup

The `cleanup_email_system()` function runs daily at 2 AM and:
- Deletes sent emails older than 30 days
- Deletes failed emails older than 7 days
- Deletes expired unsubscribe tokens

## Troubleshooting

### Cron job not running

Check if it's scheduled:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-email-queue';
```

### Emails stuck in "processing"

This can happen if the Edge Function crashes. Reset them:
```sql
UPDATE email_queue
SET status = 'pending'
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

### Check Edge Function logs

Go to **Supabase Dashboard → Edge Functions → process-email-queue → Logs**
