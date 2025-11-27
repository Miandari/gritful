'use server';

import { createClient } from '@/lib/supabase/server';

export interface ActivityFeedItem {
  id: string;
  challenge_id: string;
  user_id: string;
  activity_type: 'entry_log' | 'social_post' | 'streak_milestone' | 'join_challenge' | 'achievement_earned';
  reference_type: string | null;
  reference_id: string | null;
  message: string | null;
  metadata: any;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
  user_reaction?: string | null; // Current user's reaction if any
  reaction_breakdown?: { [key: string]: number }; // Count of each reaction type
}

interface GetActivityFeedParams {
  challengeId: string;
  limit?: number;
  offset?: number;
  activityType?: string;
}

export async function getActivityFeed({
  challengeId,
  limit = 20,
  offset = 0,
  activityType,
}: GetActivityFeedParams) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Build query
    let query = supabase
      .from('challenge_activity_feed')
      .select(`
        *,
        user:profiles!user_id (
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional filter by activity type
    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    const { data: activities, error, count } = await query;

    if (error) {
      console.error('[getActivityFeed] Error:', error);
      return { activities: [], total: 0, hasMore: false };
    }

    // Get user's reactions for these activities
    const activityIds = activities?.map((a) => a.id) || [];
    const { data: userReactions } = await supabase
      .from('activity_reactions')
      .select('activity_id, reaction_type')
      .in('activity_id', activityIds)
      .eq('user_id', user.id);

    // Create a map of activity_id -> reaction_type
    const reactionMap = new Map(
      userReactions?.map((r) => [r.activity_id, r.reaction_type]) || []
    );

    // Get all reactions for breakdown
    const { data: allReactions } = await supabase
      .from('activity_reactions')
      .select('activity_id, reaction_type')
      .in('activity_id', activityIds);

    // Build reaction breakdown: activity_id -> { reaction_type -> count }
    const reactionBreakdownMap = new Map<string, { [key: string]: number }>();
    allReactions?.forEach((reaction) => {
      if (!reactionBreakdownMap.has(reaction.activity_id)) {
        reactionBreakdownMap.set(reaction.activity_id, {});
      }
      const breakdown = reactionBreakdownMap.get(reaction.activity_id)!;
      breakdown[reaction.reaction_type] = (breakdown[reaction.reaction_type] || 0) + 1;
    });

    // Attach user reactions and breakdown to activities
    const activitiesWithReactions = activities?.map((activity) => ({
      ...activity,
      user_reaction: reactionMap.get(activity.id) || null,
      reaction_breakdown: reactionBreakdownMap.get(activity.id) || {},
    }));

    return {
      activities: activitiesWithReactions || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  } catch (error) {
    console.error('[getActivityFeed] Error:', error);
    return { activities: [], total: 0, hasMore: false };
  }
}

interface CreateSocialPostParams {
  challengeId: string;
  message: string;
}

export async function createSocialPost({
  challengeId,
  message,
}: CreateSocialPostParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 500) {
      throw new Error('Message cannot exceed 500 characters');
    }

    // Create social post
    const { data, error } = await supabase
      .from('challenge_activity_feed')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        activity_type: 'social_post',
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('[createSocialPost] Error:', error);
      throw new Error('Failed to create post');
    }

    return { success: true, activity: data };
  } catch (error) {
    console.error('[createSocialPost] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface AddReactionParams {
  activityId: string;
  reactionType: string;
}

export async function addReaction({ activityId, reactionType }: AddReactionParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Add reaction
    const { error } = await supabase
      .from('activity_reactions')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        reaction_type: reactionType,
      });

    if (error) {
      console.error('[addReaction] Error:', error);
      throw new Error('Failed to add reaction');
    }

    return { success: true };
  } catch (error) {
    console.error('[addReaction] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface RemoveReactionParams {
  activityId: string;
  reactionType: string;
}

export async function removeReaction({ activityId, reactionType }: RemoveReactionParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Remove reaction
    const { error } = await supabase
      .from('activity_reactions')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType);

    if (error) {
      console.error('[removeReaction] Error:', error);
      throw new Error('Failed to remove reaction');
    }

    return { success: true };
  } catch (error) {
    console.error('[removeReaction] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface AddCommentParams {
  activityId: string;
  comment: string;
}

export async function addComment({ activityId, comment }: AddCommentParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    if (comment.length > 500) {
      throw new Error('Comment cannot exceed 500 characters');
    }

    // Add comment
    const { data, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        comment: comment.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('[addComment] Error:', error);
      throw new Error('Failed to add comment');
    }

    return { success: true, comment: data };
  } catch (error) {
    console.error('[addComment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface GetCommentsParams {
  activityId: string;
}

export async function getComments({ activityId }: GetCommentsParams) {
  try {
    const supabase = await createClient();

    const { data: comments, error } = await supabase
      .from('activity_comments')
      .select(`
        *,
        user:profiles!user_id (
          username,
          avatar_url
        )
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getComments] Error:', error);
      return { comments: [] };
    }

    return { comments: comments || [] };
  } catch (error) {
    console.error('[getComments] Error:', error);
    return { comments: [] };
  }
}

interface MarkActivityAsReadParams {
  challengeId: string;
}

export async function markActivityAsRead({ challengeId }: MarkActivityAsReadParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Update last_activity_read_at timestamp
    const { error } = await supabase
      .from('challenge_participants')
      .update({ last_activity_read_at: new Date().toISOString() })
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[markActivityAsRead] Error:', error);
      throw new Error('Failed to mark as read');
    }

    return { success: true };
  } catch (error) {
    console.error('[markActivityAsRead] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
