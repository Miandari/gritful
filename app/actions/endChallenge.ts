'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getTodayDateStringWithTimezone, getTodayDateString } from '@/lib/utils/dates';

export async function endChallenge(
  challengeId: string,
  timezone?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is the creator and challenge is ongoing
  const { data: challenge, error: fetchError } = await supabase
    .from('challenges')
    .select('creator_id, ends_at')
    .eq('id', challengeId)
    .single();

  if (fetchError || !challenge) {
    return { success: false, error: 'Challenge not found' };
  }

  if (challenge.creator_id !== user.id) {
    return { success: false, error: 'Only the creator can end this challenge' };
  }

  if (challenge.ends_at !== null) {
    return { success: false, error: 'This challenge already has an end date' };
  }

  // Set ends_at to today to archive it (use timezone-aware date if provided)
  const today = timezone
    ? getTodayDateStringWithTimezone(timezone)
    : getTodayDateString();

  const { error } = await supabase
    .from('challenges')
    .update({
      ends_at: today,
      ended_at: new Date().toISOString(),
    } as any)
    .eq('id', challengeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath('/dashboard');

  return { success: true };
}
