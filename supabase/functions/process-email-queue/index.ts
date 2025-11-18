// Edge Function to process pending emails from the queue
// This runs periodically via pg_cron (every 5 minutes)
// Non-aggressive: Only processes pending emails, respects retry limits

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://www.gritful.app';

// Batch size - process only a few at a time to avoid overload
const BATCH_SIZE = 10;

interface EmailQueueItem {
  id: string;
  user_id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  template_name: string;
  template_data: any;
  retry_count: number;
  max_retries: number;
}

Deno.serve(async (req) => {
  try {
    // Verify this is called from Supabase (or via cron)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[Email Queue Processor] Starting batch processing...');

    // Get pending emails scheduled to be sent (oldest first)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[Email Queue Processor] Error fetching pending emails:', fetchError);
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('[Email Queue Processor] No pending emails to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No emails to process' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Email Queue Processor] Found ${pendingEmails.length} emails to process`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const email of pendingEmails as EmailQueueItem[]) {
      try {
        console.log(`[Email Queue Processor] Processing email ${email.id} for ${email.recipient_email}`);

        // Mark as processing
        await supabase
          .from('email_queue')
          .update({ status: 'processing' })
          .eq('id', email.id);

        // Build email HTML based on template
        const emailHtml = buildEmailTemplate(email.template_name, email.template_data);
        const emailText = buildEmailText(email.template_name, email.template_data);

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Gritful <noreply@gritful.app>',
            to: email.recipient_email,
            subject: email.subject,
            html: emailHtml,
            text: emailText,
            headers: {
              'List-Unsubscribe': `<${email.template_data.unsubscribe_url}>`,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        console.log(`[Email Queue Processor] Successfully sent email ${email.id}`);
        results.succeeded++;
      } catch (error: any) {
        console.error(`[Email Queue Processor] Failed to send email ${email.id}:`, error);

        // Check if we should retry
        const newRetryCount = email.retry_count + 1;
        const shouldRetry = newRetryCount < email.max_retries;

        if (shouldRetry) {
          // Schedule retry with exponential backoff (5min, 15min, 45min)
          const backoffMinutes = Math.pow(3, newRetryCount) * 5;
          const nextScheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await supabase
            .from('email_queue')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              scheduled_for: nextScheduledFor.toISOString(),
              error_message: error.message,
            })
            .eq('id', email.id);

          console.log(`[Email Queue Processor] Scheduled retry ${newRetryCount}/${email.max_retries} for email ${email.id} at ${nextScheduledFor}`);
        } else {
          // Max retries reached, mark as failed
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error.message,
            })
            .eq('id', email.id);

          console.log(`[Email Queue Processor] Email ${email.id} failed after ${email.max_retries} retries`);
        }

        results.failed++;
        results.errors.push(`${email.id}: ${error.message}`);
      }

      results.processed++;
    }

    console.log(`[Email Queue Processor] Batch complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Email Queue Processor] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Email template builder (reuse templates from email-processor)
function buildEmailTemplate(templateName: string, data: any): string {
  if (templateName === 'challenge_update') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Challenge Update</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin-top: 0;">Challenge Update</h2>
    <p style="color: #4b5563; font-size: 16px;">Hello ${data.username}!</p>
    <p style="color: #4b5563; font-size: 16px;">
      <strong>${data.sender_name}</strong> sent an update for <strong>${data.challenge_name}</strong>:
    </p>
    ${data.subject ? `<h3 style="color: #111827; margin-bottom: 8px;">${data.subject}</h3>` : ''}
    <div style="background-color: white; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151; white-space: pre-wrap;">${data.message}</p>
    </div>
    <a href="${data.action_url || `${APP_URL}/challenges/${data.challenge_id}/updates`}"
       style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 10px;">
      View Update
    </a>
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
    <p>You received this email because you're participating in a challenge on Gritful.</p>
    <a href="${data.unsubscribe_url}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from challenge updates</a>
  </div>
</body>
</html>
    `.trim();
  }

  // Default template
  return `<p>${data.message || 'No content'}</p>`;
}

function buildEmailText(templateName: string, data: any): string {
  if (templateName === 'challenge_update') {
    return `
Challenge Update

Hello ${data.username}!

${data.sender_name} sent an update for ${data.challenge_name}:

${data.subject ? data.subject + '\n\n' : ''}${data.message}

View Update: ${data.action_url || `${APP_URL}/challenges/${data.challenge_id}/updates`}

---
You received this email because you're participating in a challenge on Gritful.
Unsubscribe: ${data.unsubscribe_url}
    `.trim();
  }

  return data.message || 'No content';
}
