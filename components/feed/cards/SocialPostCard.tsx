'use client';

import { useState } from 'react';
import { type ActivityFeedItem } from '@/app/actions/activityFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ReactionBar } from '../ReactionBar';
import { CommentSection } from '../CommentSection';

interface SocialPostCardProps {
  activity: ActivityFeedItem;
  currentUserId: string;
}

export function SocialPostCard({ activity, currentUserId }: SocialPostCardProps) {
  const [showComments, setShowComments] = useState(false);

  const user = activity.user;

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header with user info */}
        <div className="flex items-start gap-3 mb-4">
          <Link href={`/profile/${user.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${user.username}`}
                className="font-semibold hover:underline"
              >
                {user.username}
              </Link>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {timeAgo}
            </div>
          </div>
        </div>

        {/* Post content */}
        {activity.message && (
          <div className="mb-4 text-sm whitespace-pre-wrap break-words">
            {activity.message}
          </div>
        )}

        {/* Reactions and comments */}
        <div className="space-y-3">
          <ReactionBar
            activityId={activity.id}
            reactionCount={activity.reaction_count}
            commentCount={activity.comment_count}
            userReaction={activity.user_reaction}
            reactionBreakdown={activity.reaction_breakdown}
            onCommentClick={() => setShowComments(!showComments)}
          />

          {showComments && (
            <CommentSection
              activityId={activity.id}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
