// Email Processor Edge Function
// Processes queued emails and sends them via Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://www.gritful.app' // Production URL - CRITICAL: Must use www subdomain
const BATCH_SIZE = 10 // Process 10 emails at a time
const MAX_RETRIES = 3

// Email template types
interface TemplateData {
  [key: string]: any
}

interface EmailTemplate {
  html: string
  text: string
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

const templates = {
  challenge_update: (data: {
    username: string
    sender_name: string
    challenge_name: string
    message: string
    challenge_id: string
    action_url?: string  // Optional custom URL for the button
    unsubscribe_url: string
  }): EmailTemplate => {
    // Use custom action URL or default to challenge page
    const actionUrl = data.action_url || `${APP_URL}/challenges/${data.challenge_id}`

    return {
    html: `
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
    <div style="background-color: white; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151; white-space: pre-wrap;">${data.message}</p>
    </div>
    <a href="${actionUrl}"
       style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 10px;">
      View Challenge
    </a>
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 30px;">
    <p>
      <a href="${data.unsubscribe_url}" style="color: #6b7280; text-decoration: underline;">
        Unsubscribe from challenge updates
      </a>
    </p>
    <p style="margin-top: 10px;">Gritful - Build better habits, one day at a time</p>
  </div>
</body>
</html>
    `,
    text: `
Challenge Update

Hello ${data.username}!

${data.sender_name} sent an update for ${data.challenge_name}:

"${data.message}"

View Challenge: ${actionUrl}

---
Unsubscribe from challenge updates: ${data.unsubscribe_url}

Gritful - Build better habits, one day at a time
    `.trim(),
    }
  },

  daily_reminder: (data: {
    username: string
    challenges: Array<{
      id: string
      name: string
      metrics: Array<{ name: string; unit: string }>
    }>
    unsubscribe_url: string
  }): EmailTemplate => ({
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Reminder</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin-top: 0;">Daily Reminder</h2>
    <p style="color: #4b5563; font-size: 16px;">Hello ${data.username}!</p>
    <p style="color: #4b5563; font-size: 16px;">Don't forget to log your progress today!</p>

    <h3 style="color: #374151; font-size: 18px; margin-top: 25px;">Your Active Challenges:</h3>
    ${data.challenges.map(challenge => `
      <div style="background-color: white; border-radius: 6px; padding: 16px; margin: 12px 0; border: 1px solid #e5e7eb;">
        <h4 style="color: #111827; margin-top: 0; margin-bottom: 8px;">${challenge.name}</h4>
        <ul style="margin: 8px 0; padding-left: 20px; color: #6b7280;">
          ${challenge.metrics.map(metric => `
            <li>${metric.name} (${metric.unit})</li>
          `).join('')}
        </ul>
        <a href="https://gritful.app/challenges/${challenge.id}"
           style="display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; margin-top: 8px;">
          Log Progress
        </a>
      </div>
    `).join('')}
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 30px;">
    <p>
      <a href="${data.unsubscribe_url}" style="color: #6b7280; text-decoration: underline;">
        Unsubscribe from daily reminders
      </a>
    </p>
    <p style="margin-top: 10px;">Gritful - Build better habits, one day at a time</p>
  </div>
</body>
</html>
    `,
    text: `
Daily Reminder

Hello ${data.username}!

Don't forget to log your progress today!

Your Active Challenges:

${data.challenges.map(challenge => `
${challenge.name}
${challenge.metrics.map(m => `  - ${m.name} (${m.unit})`).join('\n')}
Log Progress: https://gritful.app/challenges/${challenge.id}
`).join('\n')}

---
Unsubscribe from daily reminders: ${data.unsubscribe_url}

Gritful - Build better habits, one day at a time
    `.trim(),
  }),

  weekly_summary: (data: {
    username: string
    week_start: string
    week_end: string
    stats: {
      entries_logged: number
      total_points: number
      challenges_active: number
      streak_days: number
    }
    unsubscribe_url: string
  }): EmailTemplate => ({
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Summary</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin-top: 0;">Your Weekly Summary</h2>
    <p style="color: #4b5563; font-size: 16px;">Hello ${data.username}!</p>
    <p style="color: #4b5563; font-size: 16px;">Here's how you did this week (${data.week_start} - ${data.week_end}):</p>

    <div style="background-color: white; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="text-align: center; padding: 12px;">
          <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.stats.entries_logged}/7</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Days Logged</div>
        </div>
        <div style="text-align: center; padding: 12px;">
          <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.stats.total_points}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Total Points</div>
        </div>
        <div style="text-align: center; padding: 12px;">
          <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.stats.challenges_active}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Active Challenges</div>
        </div>
        <div style="text-align: center; padding: 12px;">
          <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.stats.streak_days}</div>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Current Streak</div>
        </div>
      </div>
    </div>

    <p style="color: #4b5563; font-size: 16px; text-align: center; margin-top: 20px;">Keep up the great work!</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://gritful.app/dashboard"
         style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        View Dashboard
      </a>
    </div>
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 30px;">
    <p>
      <a href="${data.unsubscribe_url}" style="color: #6b7280; text-decoration: underline;">
        Unsubscribe from weekly summaries
      </a>
    </p>
    <p style="margin-top: 10px;">Gritful - Build better habits, one day at a time</p>
  </div>
</body>
</html>
    `,
    text: `
Your Weekly Summary

Hello ${data.username}!

Here's how you did this week (${data.week_start} - ${data.week_end}):

- Days logged: ${data.stats.entries_logged}/7
- Total points: ${data.stats.total_points}
- Active challenges: ${data.stats.challenges_active}
- Current streak: ${data.stats.streak_days} days

Keep up the great work!

View Dashboard: https://gritful.app/dashboard

---
Unsubscribe from weekly summaries: ${data.unsubscribe_url}

Gritful - Build better habits, one day at a time
    `.trim(),
  }),

  join_request: (data: {
    creator_username: string
    requester_username: string
    challenge_name: string
    challenge_id: string
    request_id: string
    approve_url: string
    unsubscribe_url: string
  }): EmailTemplate => ({
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Request</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #111827; margin-top: 0;">New Join Request</h2>
    <p style="color: #4b5563; font-size: 16px;">Hello ${data.creator_username}!</p>
    <p style="color: #4b5563; font-size: 16px;">
      <strong>${data.requester_username}</strong> wants to join your challenge <strong>${data.challenge_name}</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.approve_url}"
         style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Review Join Request
      </a>
    </div>
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 30px;">
    <p>
      <a href="${data.unsubscribe_url}" style="color: #6b7280; text-decoration: underline;">
        Unsubscribe from join request notifications
      </a>
    </p>
    <p style="margin-top: 10px;">Gritful - Build better habits, one day at a time</p>
  </div>
</body>
</html>
    `,
    text: `
New Join Request

Hello ${data.creator_username}!

${data.requester_username} wants to join your challenge ${data.challenge_name}.

Review Join Request: ${data.approve_url}

---
Unsubscribe from join request notifications: ${data.unsubscribe_url}

Gritful - Build better habits, one day at a time
    `.trim(),
  }),
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  try {
    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch pending emails from queue
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      throw fetchError
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No emails to process' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${emails.length} emails...`)

    // Mark emails as processing
    const emailIds = emails.map((e) => e.id)
    await supabase
      .from('email_queue')
      .update({ status: 'processing' })
      .in('id', emailIds)

    // Helper function to add delay between emails (rate limit protection)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Process emails sequentially with 1-second delay to avoid rate limits
    const results: Array<{id: string, success: boolean, error?: string}> = []

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i]

      // Add 1-second delay between emails (except for the first one)
      if (i > 0) {
        await delay(1000)
      }

      try {
        // Generate unsubscribe token
        const { data: tokenData, error: tokenError } = await supabase.rpc(
          'generate_unsubscribe_token',
          {
            p_user_id: email.user_id,
            p_email_type: email.email_type,
            p_challenge_id: email.template_data?.challenge_id || null,
          }
        )

        if (tokenError) {
          console.error('Error generating token:', tokenError)
          throw new Error(`Token generation failed: ${tokenError.message}`)
        }

        const unsubscribe_url = `${APP_URL}/unsubscribe/${tokenData}`

        // Get template function
        const templateFn = templates[email.template_name as keyof typeof templates]
        if (!templateFn) {
          throw new Error(`Unknown template: ${email.template_name}`)
        }

        // Render template with unsubscribe URL
        const rendered = templateFn({
          ...email.template_data,
          unsubscribe_url,
        })

        // Send via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Gritful <noreply@gritful.app>',
            to: [email.recipient_email],
            subject: email.subject,
            html: rendered.html,
            text: rendered.text,
            headers: {
              'List-Unsubscribe': `<${unsubscribe_url}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        })

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text()
          throw new Error(`Resend API error (${resendResponse.status}): ${errorText}`)
        }

        const resendData = await resendResponse.json()
        console.log(`Email sent successfully:`, resendData)

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id)

        results.push({ id: email.id, success: true })
      } catch (err) {
        console.error(`Error processing email ${email.id}:`, err)

        // Mark as failed or pending for retry
        const newRetryCount = email.retry_count + 1
        const isFinalFailure = newRetryCount >= MAX_RETRIES

        await supabase
          .from('email_queue')
          .update({
            status: isFinalFailure ? 'failed' : 'pending',
            retry_count: newRetryCount,
            error_message: err instanceof Error ? err.message : String(err),
            failed_at: isFinalFailure ? new Date().toISOString() : null,
            // Exponential backoff: 5 min, 30 min, 2 hours
            scheduled_for: isFinalFailure
              ? email.scheduled_for
              : new Date(Date.now() + Math.pow(6, newRetryCount) * 60 * 1000).toISOString(),
          })
          .eq('id', email.id)

        results.push({ id: email.id, success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Calculate statistics
    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(`Processed ${emails.length} emails: ${succeeded} succeeded, ${failed} failed`)

    return new Response(
      JSON.stringify({
        processed: emails.length,
        succeeded,
        failed,
        results: results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email processor error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
