'use server';

import { createClient } from '@/lib/supabase/server';
import { createInviteLink } from '@/app/actions/inviteLinks';
import { buildPublicShareUrl, buildInviteShareUrl } from '@/lib/utils/shareUrls';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gritful.app';

/**
 * Returns the correct share URL for a challenge based on type and user role.
 * - Public challenges: direct join URL
 * - Private challenges: invite link URL (auto-creates for creators if needed)
 */
export async function getShareUrl(challengeId: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Fetch challenge details
    const { data: challenge } = await supabase
      .from('challenges')
      .select('is_public, creator_id')
      .eq('id', challengeId)
      .single() as any;

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    // Public challenges: simple direct URL
    if (challenge.is_public) {
      return { success: true, url: buildPublicShareUrl(challengeId, APP_URL) };
    }

    // Private challenges: need invite link
    const isCreator = challenge.creator_id === user.id;

    // Fetch most recent active invite link
    const { data: link, error: linkError } = await supabase
      .from('challenge_invite_links')
      .select('token, expires_at, max_uses, use_count, is_active')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any;

    if (link && !linkError) {
      const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
      const isMaxedOut = link.max_uses && link.use_count >= link.max_uses;

      if (!isExpired && !isMaxedOut) {
        return { success: true, url: buildInviteShareUrl(link.token, APP_URL) };
      }
    }

    // No valid link exists
    if (isCreator) {
      // Auto-create a new invite link for the creator
      const result = await createInviteLink(challengeId) as any;
      if (result.success && result.link) {
        return { success: true, url: buildInviteShareUrl(result.link.token, APP_URL) };
      }
      return { success: false, error: result.error || 'Failed to create invite link' };
    }

    // Non-creator participant with no valid link
    return { success: false, error: 'no_invite_link' };
  } catch (error) {
    console.error('[getShareUrl] Error:', error);
    return { success: false, error: 'Failed to generate share link' };
  }
}
