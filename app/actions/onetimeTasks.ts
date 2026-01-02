'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { calculateMetricPoints } from '@/lib/utils/scoring';
import type { OnetimeTaskCompletion } from '@/lib/validations/challenge';
import { parseLocalDate } from '@/lib/utils/dates';

interface SaveOnetimeTaskData {
  participantId: string;
  taskId: string;
  value: any;
}

/**
 * Save a one-time task completion
 */
export async function saveOnetimeTaskCompletion(data: SaveOnetimeTaskData) {
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

    // Check if challenge has ended (use parseLocalDate for correct timezone handling)
    if (challenge.ends_at) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const challengeEnd = parseLocalDate(challenge.ends_at.split('T')[0]);
      challengeEnd.setHours(23, 59, 59, 999); // End of day
      if (today > challengeEnd) {
        return { success: false, error: 'Challenge has ended' };
      }
    }

    // Find the task in the challenge metrics
    const metrics = challenge.metrics as any[];
    const task = metrics?.find((m: any) => m.id === data.taskId);

    if (!task) {
      return { success: false, error: 'Task not found in challenge' };
    }

    if (task.frequency !== 'onetime') {
      return { success: false, error: 'Task is not a one-time task' };
    }

    // Check if already completed
    const { data: existingCompletion } = await supabase
      .from('onetime_task_completions')
      .select('id')
      .eq('participant_id', data.participantId)
      .eq('task_id', data.taskId)
      .single();

    if (existingCompletion) {
      return { success: false, error: 'Task already completed' };
    }

    // Calculate points for this task
    const pointsEarned = calculateMetricPoints(task, data.value);

    // Insert the completion
    const { error: insertError } = await supabase
      .from('onetime_task_completions')
      .insert({
        participant_id: data.participantId,
        task_id: data.taskId,
        value: data.value,
        points_earned: pointsEarned,
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Update participant's total points
    await updateTotalPointsWithOnetime(participation.id);

    // Revalidate paths
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard');
    revalidatePath(`/challenges/${participation.challenge_id}`);
    revalidatePath(`/challenges/${participation.challenge_id}/progress`);
    revalidatePath(`/challenges/${participation.challenge_id}/entries`);

    return { success: true, points: pointsEarned };
  } catch (error) {
    console.error('Error saving one-time task completion:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to save task completion' };
  }
}

/**
 * Get all one-time task completions for a participant
 */
export async function getOnetimeCompletions(
  participantId: string
): Promise<{ success: boolean; data?: OnetimeTaskCompletion[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: completions, error } = await supabase
      .from('onetime_task_completions')
      .select('*')
      .eq('participant_id', participantId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data: completions as OnetimeTaskCompletion[] };
  } catch (error) {
    console.error('Error fetching one-time completions:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch completions' };
  }
}

/**
 * Delete a one-time task completion (allow undo)
 */
export async function deleteOnetimeTaskCompletion(
  participantId: string,
  taskId: string
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
      .from('onetime_task_completions')
      .delete()
      .eq('participant_id', participantId)
      .eq('task_id', taskId);

    if (deleteError) {
      throw deleteError;
    }

    // Update participant's total points
    await updateTotalPointsWithOnetime(participantId);

    // Revalidate paths
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard');
    revalidatePath(`/challenges/${participation.challenge_id}`);
    revalidatePath(`/challenges/${participation.challenge_id}/progress`);
    revalidatePath(`/challenges/${participation.challenge_id}/entries`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting one-time task completion:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete completion' };
  }
}

/**
 * Update total points including one-time and periodic task completions
 */
async function updateTotalPointsWithOnetime(participantId: string) {
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

    // Sum all points from periodic completions (weekly/monthly)
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

/**
 * Add a task to an existing challenge (creator only)
 * Supports all task types: daily, one-time, weekly, monthly
 */
export async function addTaskToChallenge(
  challengeId: string,
  task: {
    name: string;
    type: string;
    required: boolean;
    config: any;
    points: number;
    frequency: string;
    scoring_mode?: string;
    threshold?: number;
    threshold_type?: string;
    deadline?: string;
    starts_at?: string;
    ends_at?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user is the challenge creator
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, creator_id, metrics, ends_at')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can add tasks' };
    }

    // Validate that task ends_at doesn't exceed challenge ends_at (use parseLocalDate for correct timezone)
    const challengeEndDate = challenge.ends_at
      ? parseLocalDate(challenge.ends_at.split('T')[0])
      : new Date(2099, 11, 31); // Far future for ongoing challenges
    let taskEndsAt = task.ends_at
      ? parseLocalDate(task.ends_at.split('T')[0])
      : challengeEndDate;

    if (taskEndsAt > challengeEndDate) {
      taskEndsAt = challengeEndDate;
    }

    // Create the new task with a unique ID
    const taskId = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metrics = (challenge.metrics as any[]) || [];
    const newTask = {
      id: taskId,
      name: task.name,
      type: task.type,
      required: task.required,
      config: task.config,
      order: metrics.length,
      points: task.points,
      scoring_mode: task.scoring_mode,
      threshold: task.threshold,
      threshold_type: task.threshold_type,
      frequency: task.frequency,
      deadline: task.deadline,
      starts_at: task.starts_at || new Date().toISOString(),
      ends_at: taskEndsAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    // Add to metrics array
    const updatedMetrics = [...metrics, newTask];

    // Update the challenge
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ metrics: updatedMetrics })
      .eq('id', challengeId);

    if (updateError) {
      throw updateError;
    }

    // Revalidate paths
    revalidatePath(`/challenges/${challengeId}`);
    revalidatePath(`/challenges/${challengeId}/entries`);
    revalidatePath('/dashboard/today');

    return { success: true, taskId };
  } catch (error) {
    console.error('Error adding task:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add task' };
  }
}

/**
 * Add a one-time task to an existing challenge (creator only)
 * @deprecated Use addTaskToChallenge instead
 */
export async function addOnetimeTaskToChallenge(
  challengeId: string,
  task: {
    name: string;
    type: string;
    required: boolean;
    config: any;
    points: number;
    scoring_mode?: string;
    threshold?: number;
    threshold_type?: string;
    deadline?: string;
  }
) {
  return addTaskToChallenge(challengeId, {
    ...task,
    frequency: 'onetime',
  });
}

/**
 * Batch add multiple one-time tasks to a challenge (creator only)
 * All tasks are created as boolean (checkbox) type with the same deadline
 */
export async function batchAddTasks(
  challengeId: string,
  taskNames: string[],
  deadline: string | null
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, count: 0, error: 'Not authenticated' };
  }

  if (!taskNames || taskNames.length === 0) {
    return { success: false, count: 0, error: 'No tasks provided' };
  }

  try {
    // Verify user is the challenge creator
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, creator_id, metrics, ends_at')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return { success: false, count: 0, error: 'Challenge not found' };
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, count: 0, error: 'Only the challenge creator can add tasks' };
    }

    // Validate deadline doesn't exceed challenge end (use parseLocalDate for correct timezone)
    let taskDeadline = deadline;
    if (deadline && challenge.ends_at) {
      const deadlineDate = parseLocalDate(deadline.split('T')[0]);
      const challengeEndDate = parseLocalDate(challenge.ends_at.split('T')[0]);
      if (deadlineDate > challengeEndDate) {
        taskDeadline = challenge.ends_at;
      }
    }

    // Create all new tasks
    const metrics = (challenge.metrics as any[]) || [];
    const now = new Date().toISOString();
    const newTasks = taskNames.map((name, index) => ({
      id: `metric_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      type: 'boolean',
      required: true,
      config: {},
      order: metrics.length + index,
      points: 1,
      frequency: 'onetime',
      deadline: taskDeadline,
      starts_at: now,
      ends_at: challenge.ends_at,
      created_at: now,
    }));

    // Add to metrics array
    const updatedMetrics = [...metrics, ...newTasks];

    // Update the challenge
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ metrics: updatedMetrics })
      .eq('id', challengeId);

    if (updateError) {
      throw updateError;
    }

    // Revalidate paths
    revalidatePath(`/challenges/${challengeId}`);
    revalidatePath(`/challenges/${challengeId}/entries`);
    revalidatePath('/dashboard/today');

    return { success: true, count: newTasks.length };
  } catch (error) {
    console.error('Error batch adding tasks:', error);
    if (error instanceof Error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: false, count: 0, error: 'Failed to add tasks' };
  }
}
