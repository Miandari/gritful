'use client';

import { useState } from 'react';
import { type ActivityFeedItem } from '@/app/actions/activityFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Flame, Trophy } from 'lucide-react';
import Link from 'next/link';
import { ReactionBar } from '../ReactionBar';
import { CommentSection } from '../CommentSection';

interface MilestoneCardProps {
  activity: ActivityFeedItem;
  currentUserId: string;
}

export function MilestoneCard({ activity, currentUserId }: MilestoneCardProps) {
  const [showComments, setShowComments] = useState(false);

  const user = activity.user;
  const metadata = activity.metadata || {};
  const streakDays = metadata.streak_days || 0;

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  // Determine celebration level
  const getCelebrationColor = () => {
    if (streakDays >= 100) return 'from-purple-500 to-pink-500';
    if (streakDays >= 60) return 'from-orange-500 to-red-500';
    if (streakDays >= 30) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <Card className={`overflow-hidden border-2 bg-gradient-to-r ${getCelebrationColor()} bg-opacity-10`}>
      <CardContent className="p-6">
        {/* Celebratory header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold">Milestone Achievement!</h3>
          <Trophy className="h-5 w-5 text-yellow-500" />
        </div>

        {/* User info and achievement */}
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
              <span className="text-sm">
                {activity.message || `reached a ${streakDays}-day streak!`}
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {timeAgo}
            </div>
          </div>
        </div>

        {/* Milestone details */}
        <div className="bg-card rounded-lg p-4 mb-4 text-center">
          <div className="text-4xl font-bold mb-1">
            {streakDays}
          </div>
          <div className="text-sm text-muted-foreground">
            Days in a row
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
