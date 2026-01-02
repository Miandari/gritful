'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseLocalDate } from '@/lib/utils/dates';

interface UpdateChallengeData {
  challengeId: string;
  metrics: any[];
  enable_streak_bonus: boolean;
  streak_bonus_points: number;
  enable_perfect_day_bonus: boolean;
  perfect_day_bonus_points: number;
  grace_period_days?: number;
  ends_at?: string | null; // ISO date string (YYYY-MM-DD) or null for ongoing
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
    // Verify user is the challenge creator and get challenge details
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id, starts_at, ends_at, ended_at, grace_period_days')
      .eq('id', data.challengeId)
      .single() as any;

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can update settings' };
    }

    // Validate ends_at changes if provided
    if (data.ends_at !== undefined) {
      // Check if challenge is active (not ended or in grace period)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hasEnded = challenge.ends_at !== null || challenge.ended_at !== null;
      if (hasEnded) {
        const effectiveEndDateStr = challenge.ended_at
          ? challenge.ended_at.split('T')[0]
          : challenge.ends_at;
        const endDate = new Date(effectiveEndDateStr);
        endDate.setHours(0, 0, 0, 0);

        // If end date is in the past, challenge has ended
        if (endDate < today) {
          return { success: false, error: 'Cannot modify duration of an ended challenge' };
        }
      }

      // If setting a new end date (not null), validate it
      if (data.ends_at !== null) {
        const newEndDate = new Date(data.ends_at);
        newEndDate.setHours(0, 0, 0, 0);
        const startDate = new Date(challenge.starts_at);
        startDate.setHours(0, 0, 0, 0);

        if (newEndDate < today) {
          return { success: false, error: 'End date cannot be in the past' };
        }

        if (newEndDate <= startDate) {
          return { success: false, error: 'End date must be after start date' };
        }
      }
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

    // Update ends_at and duration_days if provided
    if (data.ends_at !== undefined) {
      updateData.ends_at = data.ends_at;

      if (data.ends_at === null) {
        // Converting to ongoing challenge
        updateData.duration_days = null;
      } else {
        // Calculate duration_days from starts_at to new ends_at (use parseLocalDate for correct timezone)
        const startDate = parseLocalDate(challenge.starts_at.split('T')[0]);
        const endDate = parseLocalDate(data.ends_at.split('T')[0]);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
        updateData.duration_days = diffDays;
      }
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
