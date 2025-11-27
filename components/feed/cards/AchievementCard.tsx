'use client';

import { useState } from 'react';
import { type ActivityFeedItem } from '@/app/actions/activityFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Award } from 'lucide-react';
import Link from 'next/link';
import { ReactionBar } from '../ReactionBar';
import { CommentSection } from '../CommentSection';
import { CATEGORY_COLORS, type AchievementCategory } from '@/lib/achievements/types';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  activity: ActivityFeedItem;
  currentUserId: string;
}

export function AchievementCard({ activity, currentUserId }: AchievementCardProps) {
  const [showComments, setShowComments] = useState(false);

  const user = activity.user;
  const metadata = activity.metadata || {};
  const achievementName = metadata.achievement_name || 'Achievement';
  const achievementDescription = metadata.achievement_description || '';
  const achievementIcon = metadata.achievement_icon || '';
  const achievementCategory = (metadata.achievement_category || 'custom') as AchievementCategory;

  // Get category colors
  const colors = CATEGORY_COLORS[achievementCategory] || CATEGORY_COLORS.custom;

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <Card className="overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
      <CardContent className="p-6">
        {/* Celebratory header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Award className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold">Achievement Unlocked!</h3>
          <Award className="h-5 w-5 text-yellow-500" />
        </div>

        {/* User info */}
        <div className="flex items-start gap-3 mb-4">
          <Link href={`/profile/${user.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
              <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/profile/${user.username}`}
                className="font-semibold hover:underline"
              >
                {user.username}
              </Link>
              <span className="text-sm text-muted-foreground">
                {activity.message}
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {timeAgo}
            </div>
          </div>
        </div>

        {/* Achievement badge display */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-card rounded-lg p-6 text-center shadow-inner">
            {/* Badge */}
            <div
              className={cn(
                'mx-auto w-20 h-20 rounded-full flex items-center justify-center border-4 mb-3',
                colors.bg,
                colors.border
              )}
            >
              <span className="text-4xl drop-shadow-lg">{achievementIcon}</span>
            </div>

            {/* Name */}
            <div className="text-xl font-bold mb-1">
              {achievementName}
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground">
              &quot;{achievementDescription}&quot;
            </div>
          </div>
        </div>

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
