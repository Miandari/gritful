'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

// Types for invite link settings
export interface InviteLinkSettings {
  auto_admit?: boolean;
  expires_at?: string | null;
  max_uses?: number | null;
}

// Generate a URL-safe token
function generateToken(length = 12): string {
  return nanoid(length);
}

/**
 * Create a new invite link for a challenge
 * Only the challenge creator can create links
 */
export async function createInviteLink(
  challengeId: string,
  settings?: InviteLinkSettings
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
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id, is_public')
      .eq('id', challengeId)
      .single() as any;

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can create invite links' };
    }

    if (challenge.is_public) {
      return { success: false, error: 'Invite links are only for private challenges' };
    }

    // Deactivate any existing active links for this challenge
    await (supabase
      .from('challenge_invite_links') as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('challenge_id', challengeId)
      .eq('is_active', true);

    // Create new invite link
    const token = generateToken();
    const { data: link, error: insertError } = await supabase
      .from('challenge_invite_links')
      .insert({
        challenge_id: challengeId,
        token,
        auto_admit: settings?.auto_admit ?? true,
        expires_at: settings?.expires_at || null,
        max_uses: settings?.max_uses || null,
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite link:', insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath(`/challenges/${challengeId}`);
    return { success: true, link };
  } catch (error) {
    console.error('Error creating invite link:', error);
    return { success: false, error: 'Failed to create invite link' };
  }
}

/**
 * Get the active invite link for a challenge
 * Returns null if no active link exists
 */
export async function getInviteLink(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // First check if user is the creator (for full link details)
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id')
      .eq('id', challengeId)
      .single() as any;

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    const isCreator = challenge.creator_id === user.id;

    // Get the active invite link
    const { data: link, error } = await supabase
      .from('challenge_invite_links')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .single() as any;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error fetching invite link:', error);
      return { success: false, error: error.message };
    }

    return { success: true, link: link || null, isCreator };
  } catch (error) {
    console.error('Error fetching invite link:', error);
    return { success: false, error: 'Failed to fetch invite link' };
  }
}

/**
 * Update settings for an existing invite link
 */
export async function updateInviteLinkSettings(
  linkId: string,
  settings: InviteLinkSettings
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get the link and verify ownership
    const { data: link } = await supabase
      .from('challenge_invite_links')
      .select('challenge_id')
      .eq('id', linkId)
      .single() as any;

    if (!link) {
      return { success: false, error: 'Invite link not found' };
    }

    // Verify user is the challenge creator
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id')
      .eq('id', link.challenge_id)
      .single() as any;

    if (!challenge || challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can update invite links' };
    }

    // Update the link
    const { error: updateError } = await (supabase
      .from('challenge_invite_links') as any)
      .update({
        auto_admit: settings.auto_admit,
        expires_at: settings.expires_at,
        max_uses: settings.max_uses,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId);

    if (updateError) {
      console.error('Error updating invite link:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/challenges/${link.challenge_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating invite link:', error);
    return { success: false, error: 'Failed to update invite link' };
  }
}

/**
 * Revoke an invite link (deactivate it)
 */
export async function revokeInviteLink(linkId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get the link and verify ownership
    const { data: link } = await supabase
      .from('challenge_invite_links')
      .select('challenge_id')
      .eq('id', linkId)
      .single() as any;

    if (!link) {
      return { success: false, error: 'Invite link not found' };
    }

    // Verify user is the challenge creator
    const { data: challenge } = await supabase
      .from('challenges')
      .select('creator_id')
      .eq('id', link.challenge_id)
      .single() as any;

    if (!challenge || challenge.creator_id !== user.id) {
      return { success: false, error: 'Only the challenge creator can revoke invite links' };
    }

    // Deactivate the link
    const { error: updateError } = await (supabase
      .from('challenge_invite_links') as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId);

    if (updateError) {
      console.error('Error revoking invite link:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/challenges/${link.challenge_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error revoking invite link:', error);
    return { success: false, error: 'Failed to revoke invite link' };
  }
}

/**
 * Regenerate an invite link (revoke old one and create new)
 */
export async function regenerateInviteLink(
  challengeId: string,
  settings?: InviteLinkSettings
) {
  // Simply create a new link - createInviteLink handles deactivating old ones
  return createInviteLink(challengeId, settings);
}

/**
 * Get public challenge info by invite link token (for landing page)
 * Does NOT require authentication
 */
export async function getInviteLinkByToken(token: string) {
  // Use service role client to bypass RLS for invite link preview
  // This allows viewing private challenge info via invite link
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (err) {
    console.error('[getInviteLinkByToken] Failed to create service role client:', err);
    return { success: false, error: 'Server configuration error' };
  }

  const userSupabase = await createClient();

  try {
    // Get the invite link
    const { data: link, error: linkError } = await supabase
      .from('challenge_invite_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single() as any;

    console.log('[getInviteLinkByToken] Link query result:', {
      token,
      found: !!link,
      error: linkError?.message
    });

    if (linkError || !link) {
      return { success: false, error: 'Invalid or expired invite link' };
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { success: false, error: 'This invite link has expired' };
    }

    // Check if max uses reached
    if (link.max_uses && link.use_count >= link.max_uses) {
      return { success: false, error: 'This invite link has reached its maximum uses' };
    }

    // Get challenge info (using service role to bypass RLS for private challenges)
    // Note: Fetching creator profile separately due to Supabase schema cache issue
    // (foreign key relationship not detected by PostgREST)
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select(`
        id,
        name,
        description,
        starts_at,
        ends_at,
        duration_days,
        metrics,
        creator_id
      `)
      .eq('id', link.challenge_id)
      .single() as any;

    if (challengeError || !challenge) {
      console.error('[getInviteLinkByToken] Challenge query error:', challengeError);
      return { success: false, error: 'Challenge not found' };
    }

    // Fetch creator profile separately
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', challenge.creator_id)
      .single() as any;

    // Attach creator to challenge object
    challenge.creator = creatorProfile || null;

    // Get participant count
    const { count: participantCount } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', link.challenge_id)
      .eq('status', 'active');

    // Check if current user is already a member (use user's client for auth)
    let isAlreadyMember = false;
    let hasPendingRequest = false;
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (user) {
      // Use service role client for these queries to bypass RLS
      const { data: participation } = await supabase
        .from('challenge_participants')
        .select('id')
        .eq('challenge_id', link.challenge_id)
        .eq('user_id', user.id)
        .single() as any;

      isAlreadyMember = !!participation;

      if (!isAlreadyMember) {
        const { data: pendingRequest } = await supabase
          .from('challenge_join_requests')
          .select('id')
          .eq('challenge_id', link.challenge_id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single() as any;

        hasPendingRequest = !!pendingRequest;
      }
    }

    return {
      success: true,
      link: {
        id: link.id,
        auto_admit: link.auto_admit,
        expires_at: link.expires_at,
        max_uses: link.max_uses,
        use_count: link.use_count,
      },
      challenge: {
        ...challenge,
        participantCount: participantCount || 0,
      },
      isAlreadyMember,
      hasPendingRequest,
      isAuthenticated: !!user,
    };
  } catch (error) {
    console.error('Error fetching invite link by token:', error);
    return { success: false, error: 'Failed to fetch invite link' };
  }
}

/**
 * Join a challenge via invite link
 */
export async function joinViaInviteLink(token: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to join a challenge' };
  }

  try {
    // Get the invite link
    const { data: link, error: linkError } = await supabase
      .from('challenge_invite_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single() as any;

    if (linkError || !link) {
      return { success: false, error: 'Invalid or expired invite link' };
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      // Log the failed attempt
      await supabase.from('invite_link_uses').insert({
        invite_link_id: link.id,
        user_id: user.id,
        result: 'expired',
      } as any);
      return { success: false, error: 'This invite link has expired' };
    }

    // Check if max uses reached
    if (link.max_uses && link.use_count >= link.max_uses) {
      // Log the failed attempt
      await supabase.from('invite_link_uses').insert({
        invite_link_id: link.id,
        user_id: user.id,
        result: 'max_uses_reached',
      } as any);
      return { success: false, error: 'This invite link has reached its maximum uses' };
    }

    // Check if already a member
    const { data: existingParticipation } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', link.challenge_id)
      .eq('user_id', user.id)
      .single() as any;

    if (existingParticipation) {
      // Log the attempt
      await supabase.from('invite_link_uses').insert({
        invite_link_id: link.id,
        user_id: user.id,
        result: 'already_member',
      } as any);
      return {
        success: false,
        error: 'You are already a member of this challenge',
        challengeId: link.challenge_id,
        alreadyMember: true,
      };
    }

    // Check if already has pending request
    const { data: pendingRequest } = await supabase
      .from('challenge_join_requests')
      .select('id')
      .eq('challenge_id', link.challenge_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single() as any;

    if (pendingRequest) {
      return {
        success: false,
        error: 'You already have a pending join request for this challenge',
        hasPendingRequest: true,
      };
    }

    if (link.auto_admit) {
      // Auto-admit: Join directly
      const { error: joinError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: link.challenge_id,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
        } as any);

      if (joinError) {
        console.error('Error joining challenge:', joinError);
        return { success: false, error: joinError.message };
      }

      // Log successful join
      await supabase.from('invite_link_uses').insert({
        invite_link_id: link.id,
        user_id: user.id,
        result: 'joined',
      } as any);

      // Increment use count
      // @ts-ignore - function not in generated types yet
      await supabase.rpc('increment_invite_link_use_count', { link_id: link.id });

      revalidatePath('/dashboard');
      revalidatePath(`/challenges/${link.challenge_id}`);

      return {
        success: true,
        result: 'joined',
        challengeId: link.challenge_id,
      };
    } else {
      // Requires approval: Create join request
      const { error: requestError } = await supabase
        .from('challenge_join_requests')
        .insert({
          challenge_id: link.challenge_id,
          user_id: user.id,
          status: 'pending',
        } as any);

      if (requestError) {
        // Check if it's a duplicate request error
        if (requestError.code === '23505') {
          return {
            success: false,
            error: 'You have already requested to join this challenge',
          };
        }
        console.error('Error creating join request:', requestError);
        return { success: false, error: requestError.message };
      }

      // Log the request creation
      await supabase.from('invite_link_uses').insert({
        invite_link_id: link.id,
        user_id: user.id,
        result: 'request_created',
      } as any);

      // Increment use count
      // @ts-ignore - function not in generated types yet
      await supabase.rpc('increment_invite_link_use_count', { link_id: link.id });

      revalidatePath('/challenges/browse');
      revalidatePath('/challenges/requests');

      return {
        success: true,
        result: 'request_created',
        challengeId: link.challenge_id,
      };
    }
  } catch (error) {
    console.error('Error joining via invite link:', error);
    return { success: false, error: 'Failed to join challenge' };
  }
}
