'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { calculateMetricPoints } from '@/lib/utils/scoring';
import { getPeriodForDate, formatPeriodKey, formatPeriodEnd } from '@/lib/utils/periods';
import type { PeriodicTaskCompletion } from '@/lib/validations/challenge';

interface SavePeriodicTaskData {
  participantId: string;
  taskId: string;
  frequency: 'weekly' | 'monthly';
  value: any;
}

/**
 * Save a periodic (weekly/monthly) task completion
 */
export async function savePeriodicTaskCompletion(data: SavePeriodicTaskData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify the participation belongs to the user
    const { data: participation, error: participationError } = await supabase
      .from('challenge_participants')
      .select('id, challenge_id, user_id')
      .eq('id', data.participantId)
      .eq('user_id', user.id)
      .single();

    if (participationError || !participation) {
      console.error('Error fetching participation:', participationError);
      return { success: false, error: 'Participation not found' };
    }

    // Get challenge with metrics to calculate points
    const { data: challenge } = await supabase
      .from('challenges')
      .select('metrics, ends_at')
      .eq('id', participation.challenge_id)
      .single();

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    // Check if challenge has ended
    const challengeEnd = new Date(challenge.ends_at);
    if (new Date() > challengeEnd) {
      return { success: false, error: 'Challenge has ended' };
    }

    // Find the task in the challenge metrics
    const metrics = challenge.metrics as any[];
    const task = metrics?.find((m: any) => m.id === data.taskId);

    if (!task) {
      return { success: false, error: 'Task not found in challenge' };
    }

    if (task.frequency !== data.frequency) {
      return { success: false, error: `Task is not a ${data.frequency} task` };
    }

    // Get current period
    const currentPeriod = getPeriodForDate(data.frequency);
    const periodStart = formatPeriodKey(currentPeriod);
    const periodEnd = formatPeriodEnd(currentPeriod);

    // Check if already completed for this period
    const { data: existingCompletion } = await supabase
      .from('periodic_task_completions')
      .select('id')
      .eq('participant_id', data.participantId)
      .eq('task_id', data.taskId)
      .eq('period_start', periodStart)
      .single();

    if (existingCompletion) {
      return { success: false, error: `Task already completed for this ${data.frequency === 'weekly' ? 'week' : 'month'}` };
    }

    // Calculate points for this task
    const pointsEarned = calculateMetricPoints(task, data.value);

    // Insert the completion
    const { error: insertError } = await supabase
      .from('periodic_task_completions')
      .insert({
        participant_id: data.participantId,
        task_id: data.taskId,
        frequency: data.frequency,
        period_start: periodStart,
        period_end: periodEnd,
        value: data.value,
        points_earned: pointsEarned,
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Update participant's total points
    await updateTotalPointsWithPeriodic(participation.id);

    // Revalidate paths
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard');
    revalidatePath(`/challenges/${participation.challenge_id}`);
    revalidatePath(`/challenges/${participation.challenge_id}/progress`);
    revalidatePath(`/challenges/${participation.challenge_id}/entries`);

    return { success: true, points: pointsEarned };
  } catch (error) {
    console.error('Error saving periodic task completion:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to save task completion' };
  }
}

/**
 * Get all periodic task completions for a participant
 */
export async function getPeriodicCompletions(
  participantId: string
): Promise<{ success: boolean; data?: PeriodicTaskCompletion[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: completions, error } = await supabase
      .from('periodic_task_completions')
      .select('*')
      .eq('participant_id', participantId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data: completions as PeriodicTaskCompletion[] };
  } catch (error) {
    console.error('Error fetching periodic completions:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch completions' };
  }
}

/**
 * Delete a periodic task completion (allow undo)
 */
export async function deletePeriodicTaskCompletion(
  participantId: string,
  taskId: string,
  periodStart: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify ownership
    const { data: participation } = await supabase
      .from('challenge_participants')
      .select('id, challenge_id, user_id')
      .eq('id', participantId)
      .eq('user_id', user.id)
      .single();

    if (!participation) {
      return { success: false, error: 'Participation not found' };
    }

    // Delete the completion
    const { error: deleteError } = await supabase
      .from('periodic_task_completions')
      .delete()
      .eq('participant_id', participantId)
      .eq('task_id', taskId)
      .eq('period_start', periodStart);

    if (deleteError) {
      throw deleteError;
    }

    // Update participant's total points
    await updateTotalPointsWithPeriodic(participantId);

    // Revalidate paths
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard');
    revalidatePath(`/challenges/${participation.challenge_id}`);
    revalidatePath(`/challenges/${participation.challenge_id}/progress`);
    revalidatePath(`/challenges/${participation.challenge_id}/entries`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting periodic task completion:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete completion' };
  }
}

/**
 * Update total points including periodic task completions
 */
async function updateTotalPointsWithPeriodic(participantId: string) {
  const supabase = await createClient();

  try {
    // Sum all points from daily entries
    const { data: dailyEntries } = await supabase
      .from('daily_entries')
      .select('points_earned, bonus_points')
      .eq('participant_id', participantId);

    // Sum all points from one-time completions
    const { data: onetimeCompletions } = await supabase
      .from('onetime_task_completions')
      .select('points_earned')
      .eq('participant_id', participantId);

    // Sum all points from periodic completions
    const { data: periodicCompletions } = await supabase
      .from('periodic_task_completions')
      .select('points_earned')
      .eq('participant_id', participantId);

    const dailyPoints = (dailyEntries || []).reduce((sum, entry) => {
      return sum + (entry.points_earned || 0) + (entry.bonus_points || 0);
    }, 0);

    const onetimePoints = (onetimeCompletions || []).reduce((sum, completion) => {
      return sum + (completion.points_earned || 0);
    }, 0);

    const periodicPoints = (periodicCompletions || []).reduce((sum, completion) => {
      return sum + (completion.points_earned || 0);
    }, 0);

    const totalPoints = dailyPoints + onetimePoints + periodicPoints;

    // Update participant's total points
    await supabase
      .from('challenge_participants')
      .update({ total_points: totalPoints })
      .eq('id', participantId);
  } catch (error) {
    console.error('Error updating total points:', error);
  }
}
