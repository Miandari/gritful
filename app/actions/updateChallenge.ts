'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseLocalDate, getLocalDateFromISO, getLocalDateFromISOWithTimezone, getTodayDateStringWithTimezone } from '@/lib/utils/dates';

interface UpdateChallengeData {
  challengeId: string;
  metrics: any[];
  enable_streak_bonus: boolean;
  streak_bonus_points: number;
  enable_perfect_day_bonus: boolean;
  perfect_day_bonus_points: number;
  grace_period_days?: number;
  ends_at?: string | null; // ISO date string (YYYY-MM-DD) or null for ongoing
  timezone?: string; // Optional timezone for correct date handling
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
      // Get today's date string in user's timezone (or use server default)
      const todayStr = data.timezone
        ? getTodayDateStringWithTimezone(data.timezone)
        : getLocalDateFromISO(new Date().toISOString());

      const hasEnded = challenge.ends_at !== null || challenge.ended_at !== null;
      if (hasEnded) {
        const effectiveEndDateStr = challenge.ended_at
          ? (data.timezone ? getLocalDateFromISOWithTimezone(challenge.ended_at, data.timezone) : getLocalDateFromISO(challenge.ended_at))
          : challenge.ends_at ? (data.timezone ? getLocalDateFromISOWithTimezone(challenge.ends_at, data.timezone) : getLocalDateFromISO(challenge.ends_at)) : null;

        // Compare date strings directly (YYYY-MM-DD format)
        if (effectiveEndDateStr && effectiveEndDateStr < todayStr) {
          return { success: false, error: 'Cannot modify duration of an ended challenge' };
        }
      }

      // If setting a new end date (not null), validate it
      if (data.ends_at !== null) {
        // Parse the new end date (it may be YYYY-MM-DD or ISO format)
        const newEndDateStr = data.ends_at.includes('T')
          ? (data.timezone ? getLocalDateFromISOWithTimezone(data.ends_at, data.timezone) : getLocalDateFromISO(data.ends_at))
          : data.ends_at;
        const startDateStr = data.timezone
          ? getLocalDateFromISOWithTimezone(challenge.starts_at, data.timezone)
          : getLocalDateFromISO(challenge.starts_at);

        if (newEndDateStr < todayStr) {
          return { success: false, error: 'End date cannot be in the past' };
        }

        if (newEndDateStr <= startDateStr) {
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
        // Calculate duration_days from starts_at to new ends_at
        const startDateStr = data.timezone
          ? getLocalDateFromISOWithTimezone(challenge.starts_at, data.timezone)
          : getLocalDateFromISO(challenge.starts_at);
        const endDateStr = data.ends_at.includes('T')
          ? (data.timezone ? getLocalDateFromISOWithTimezone(data.ends_at, data.timezone) : getLocalDateFromISO(data.ends_at))
          : data.ends_at;
        const startDate = parseLocalDate(startDateStr);
        const endDate = parseLocalDate(endDateStr);
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
