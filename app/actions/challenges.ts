'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ChallengeFormData } from '@/lib/validations/challenge';
import { addDays } from 'date-fns';

// Generate a unique invite code
function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createChallenge(data: ChallengeFormData) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create a challenge' };
  }

  try {
    // Calculate end date (null for ongoing challenges)
    const startDate = new Date(data.starts_at);
    const isOngoing = data.is_ongoing === true;
    let endDate: Date | null = null;

    if (!isOngoing && data.duration_days) {
      endDate = addDays(startDate, data.duration_days - 1);
    }

    // Generate invite code if private
    const inviteCode = !data.is_public ? generateInviteCode() : null;

    // Create the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        creator_id: user.id,
        name: data.name,
        description: data.description,
        duration_days: isOngoing ? null : data.duration_days,
        starts_at: startDate.toISOString().split('T')[0],
        ends_at: endDate ? endDate.toISOString().split('T')[0] : null,
        is_public: data.is_public,
        is_template: data.is_template,
        invite_code: inviteCode,
        lock_entries_after_day: data.lock_entries_after_day,
        show_participant_details: data.show_participant_details ?? true,
        failure_mode: data.failure_mode,
        enable_streak_bonus: data.enable_streak_bonus ?? false,
        streak_bonus_points: data.streak_bonus_points ?? 5,
        enable_perfect_day_bonus: data.enable_perfect_day_bonus ?? false,
        perfect_day_bonus_points: data.perfect_day_bonus_points ?? 10,
        grace_period_days: data.grace_period_days ?? 7,
        metrics: data.metrics,
        creator_settings: {},
      } as any)
      .select()
      .single() as any;

    if (challengeError) {
      console.error('Challenge creation error:', challengeError);
      return { error: challengeError.message };
    }

    // Automatically join the creator as a participant
    const { error: participantError } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challenge.id,
        user_id: user.id,
        status: 'active',
      } as any);

    if (participantError) {
      console.error('Participant creation error:', participantError);
      // Don't fail the whole operation, but log the error
    }

    revalidatePath('/dashboard');
    revalidatePath('/challenges');

    return {
      id: challenge.id,
      invite_code: inviteCode,
    };
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { error: error.message || 'Failed to create challenge' };
  }
}

export async function getChallenge(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('challenges')
    .select(
      `
      *,
      creator:profiles!challenges_creator_id_fkey (
        id,
        username,
        avatar_url
      ),
      participants:challenge_participants (
        id,
        user_id,
        status,
        current_streak,
        longest_streak
      )
    `
    )
    .eq('id', id)
    .single() as any;

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function joinChallenge(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'You must be logged in to join a challenge' };
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .single() as any;

  if (existing) {
    return { success: false, error: 'You have already joined this challenge' };
  }

  // Join the challenge
  const { error } = await supabase.from('challenge_participants').insert({
    challenge_id: challengeId,
    user_id: user.id,
    status: 'active',
    joined_at: new Date().toISOString(),
  } as any);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/challenges/${challengeId}`);

  return { success: true };
}

export async function joinChallengeWithCode(inviteCode: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'You must be logged in to join a challenge' };
  }

  // Find challenge by invite code
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id')
    .eq('invite_code', inviteCode.toUpperCase())
    .single() as any;

  if (challengeError || !challenge) {
    return { success: false, error: 'Invalid invite code' };
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', challenge.id)
    .eq('user_id', user.id)
    .single() as any;

  if (existing) {
    return { success: false, error: 'You have already joined this challenge' };
  }

  // Join the challenge
  const { error } = await supabase.from('challenge_participants').insert({
    challenge_id: challenge.id,
    user_id: user.id,
    status: 'active',
    joined_at: new Date().toISOString(),
  } as any);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/challenges/${challenge.id}`);

  return { success: true, challengeId: challenge.id };
}

export async function leaveChallenge(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'You must be logged in to leave a challenge' };
  }

  // Delete participation record (or update status to 'left' if you want to keep history)
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/challenges/${challengeId}`);

  return { success: true };
}

export async function deleteChallenge(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'You must be logged in to delete a challenge' };
  }

  // Verify the user is the creator
  const { data: challenge } = await supabase
    .from('challenges')
    .select('creator_id')
    .eq('id', challengeId)
    .single() as any;

  if (!challenge || challenge.creator_id !== user.id) {
    return { success: false, error: 'You can only delete challenges you created' };
  }

  // Delete the challenge (cascades will handle related records)
  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challengeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/challenges');

  return { success: true };
}