import { createServiceRoleClient } from '@/lib/supabase/server';
import { after } from 'next/server';

type PushCategory = 'reminders' | 'milestones' | 'challenge_activity' | 'leaderboard';

const PUSH_PREF_COLUMNS: Record<PushCategory, string> = {
  reminders: 'push_reminders',
  milestones: 'push_milestones',
  challenge_activity: 'push_challenge_activity',
  leaderboard: 'push_leaderboard',
};

/**
 * Conditionally send a push notification based on user preferences.
 * Call this AFTER inserting into the notifications table.
 *
 * Uses next/server's after() to dispatch the push after the response
 * is sent to the client, avoiding serverless runtime freeze issues.
 */
export async function maybeSendPush(
  userId: string,
  category: PushCategory,
  title: string,
  body: string,
  url: string
) {
  const supabase = createServiceRoleClient();
  const prefColumn = PUSH_PREF_COLUMNS[category];

  // Check user's push preference for this category.
  // Use .maybeSingle() to avoid PGRST116 error if the user_preferences
  // row hasn't been created yet (race condition on fresh signups).
  // Default to true (send push) if no preferences row exists.
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select(prefColumn)
    .eq('user_id', userId)
    .maybeSingle();

  if (prefs && (prefs as Record<string, boolean>)[prefColumn] === false) return;

  // Check if user has any push subscriptions
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!count) return;

  // Dispatch push after the response is sent to the client
  after(async () => {
    try {
      const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`;
      await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, title, body, url }),
      });
    } catch (err) {
      console.error('Push delivery failed:', err);
    }
  });
}
