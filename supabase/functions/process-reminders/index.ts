// Process Reminders Edge Function
// Called every 15 minutes by pg_cron via pg_net
// Finds users due for reminders with pending tasks, sends push notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:hello@gritful.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

serve(async (_req) => {
  try {
    // Find users who are due for a reminder right now
    const { data: eligibleUsers, error: queryError } = await supabase.rpc(
      'get_reminder_eligible_users'
    )

    if (queryError) {
      console.error('[Reminders] Error finding eligible users:', queryError)
      throw queryError
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users due for reminder' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0

    for (const user of eligibleUsers) {
      // Get push subscriptions for this user
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, keys_p256dh, keys_auth')
        .eq('user_id', user.user_id)

      if (!subscriptions || subscriptions.length === 0) continue

      const payload = JSON.stringify({
        title: 'Time to log your progress',
        body: 'You have unfinished tasks waiting for you',
        url: '/dashboard/today',
      })

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
            payload
          )
          sent++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Reminders] Removing dead subscription ${sub.id}`)
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error(`[Reminders] Push failed for ${sub.id}:`, err.statusCode, err.body)
          }
          failed++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, users: eligibleUsers.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Reminders] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
