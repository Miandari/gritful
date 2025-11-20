'use client';

import { useState } from 'react';
import { type ActivityFeedItem } from '@/app/actions/activityFeed';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Flame, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { ReactionBar } from '../ReactionBar';
import { CommentSection } from '../CommentSection';

interface EntryLogCardProps {
  activity: ActivityFeedItem;
  currentUserId: string;
}

export function EntryLogCard({ activity, currentUserId }: EntryLogCardProps) {
  const [showComments, setShowComments] = useState(false);

  const user = activity.user;
  const metadata = activity.metadata || {};
  const entryDate = metadata.entry_date;
  const submittedAt = metadata.submitted_at;
  const currentStreak = metadata.current_streak || 0;
  const bonusPoints = metadata.bonus_points || 0;
  const isPerfectDay = metadata.is_perfect_day || false;

  // Check if submission is late (submitted after the entry date)
  const isLateSubmission = entryDate && submittedAt
    ? (() => {
        // Parse dates - entry_date is just a date, submitted_at is a full timestamp
        const entryDateObj = new Date(entryDate + 'T00:00:00');
        const submittedDateObj = new Date(submittedAt);

        // Get the calendar date (YYYY-MM-DD) from submitted_at
        const submittedDateOnly = new Date(
          submittedDateObj.getFullYear(),
          submittedDateObj.getMonth(),
          submittedDateObj.getDate()
        );

        // Compare: submitted date should not be after entry date
        const isLate = submittedDateOnly > entryDateObj;

        return isLate;
      })()
    : false;

  // Format entry date
  const formattedDate = entryDate
    ? new Date(entryDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <Card className={`overflow-hidden ${isLateSubmission ? 'border-amber-500 border-2' : ''}`}>
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
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/profile/${user.username}`}
                className="font-semibold hover:underline"
              >
                {user.username}
              </Link>
              <span className="text-sm text-muted-foreground">
                {activity.message || 'completed their daily entry'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Streak badge - always show, minimum 1 day when entry is completed */}
          <Badge variant="secondary" className="gap-1">
            <Flame className="h-3 w-3" />
            {Math.max(1, currentStreak)} day{Math.max(1, currentStreak) !== 1 ? 's' : ''} streak
          </Badge>

          {/* Perfect Day badge - show if entry has bonus points */}
          {isPerfectDay && bonusPoints > 0 && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <Trophy className="h-3 w-3" />
              Perfect Day
            </Badge>
          )}

          {/* Late submission badge */}
          {isLateSubmission && (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Late submission
            </Badge>
          )}
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
