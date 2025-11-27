'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface UpdateChallengeData {
  challengeId: string;
  metrics: any[];
  enable_streak_bonus: boolean;
  streak_bonus_points: number;
  enable_perfect_day_bonus: boolean;
  perfect_day_bonus_points: number;
  grace_period_days?: number;
}

export async function updateChallengeSettings(data: UpdateChallengeData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user is the challenge creator
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id')
      .eq('id', data.challengeId)
      .single() as any;

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can update settings' };
    }

    // Update the challenge
    const updateData: any = {
      metrics: data.metrics,
      enable_streak_bonus: data.enable_streak_bonus,
      streak_bonus_points: data.streak_bonus_points,
      enable_perfect_day_bonus: data.enable_perfect_day_bonus,
      perfect_day_bonus_points: data.perfect_day_bonus_points,
    };

    // Only update grace_period_days if provided
    if (data.grace_period_days !== undefined) {
      updateData.grace_period_days = data.grace_period_days;
    }

    const { error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', data.challengeId);

    if (error) {
      console.error('Update error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/challenges/${data.challengeId}`);
    revalidatePath(`/challenges/${data.challengeId}/edit`);
    revalidatePath(`/challenges/${data.challengeId}/progress`);

    return { success: true };
  } catch (error) {
    console.error('Error updating challenge:', error);
    return { success: false, error: 'Failed to update challenge' };
  }
}
