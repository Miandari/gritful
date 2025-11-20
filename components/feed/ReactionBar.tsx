'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Flame, Sparkles } from 'lucide-react';
import { addReaction, removeReaction } from '@/app/actions/activityFeed';
import { useRouter } from 'next/navigation';

interface ReactionBarProps {
  activityId: string;
  reactionCount: number;
  commentCount: number;
  userReaction: string | null | undefined;
  reactionBreakdown?: { [key: string]: number };
  onCommentClick: () => void;
}

const REACTION_TYPES = {
  cheer: { icon: Sparkles, label: 'Cheer', color: 'text-yellow-500' },
  fire: { icon: Flame, label: 'Fire', color: 'text-orange-500' },
  heart: { icon: Heart, label: 'Love', color: 'text-red-500' },
};

export function ReactionBar({
  activityId,
  reactionCount,
  commentCount,
  userReaction,
  reactionBreakdown = {},
  onCommentClick,
}: ReactionBarProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [currentReaction, setCurrentReaction] = useState(userReaction);
  const [optimisticCount, setOptimisticCount] = useState(reactionCount);
  const [optimisticBreakdown, setOptimisticBreakdown] = useState(reactionBreakdown);

  const handleReaction = async (reactionType: string) => {
    // Optimistic update
    const wasReacted = currentReaction === reactionType;
    const previousReaction = currentReaction;

    // Update current reaction state
    setCurrentReaction(wasReacted ? null : reactionType);

    // Update total count
    setOptimisticCount((prev) => (wasReacted ? prev - 1 : prev + (currentReaction ? 0 : 1)));

    // Update breakdown optimistically
    setOptimisticBreakdown((prev) => {
      const newBreakdown = { ...prev };

      // If removing reaction
      if (wasReacted) {
        newBreakdown[reactionType] = Math.max(0, (newBreakdown[reactionType] || 0) - 1);
        if (newBreakdown[reactionType] === 0) {
          delete newBreakdown[reactionType];
        }
      } else {
        // If switching reactions, decrement old
        if (previousReaction) {
          newBreakdown[previousReaction] = Math.max(0, (newBreakdown[previousReaction] || 0) - 1);
          if (newBreakdown[previousReaction] === 0) {
            delete newBreakdown[previousReaction];
          }
        }
        // Increment new reaction
        newBreakdown[reactionType] = (newBreakdown[reactionType] || 0) + 1;
      }

      return newBreakdown;
    });

    startTransition(async () => {
      if (wasReacted) {
        // Remove reaction
        await removeReaction({ activityId, reactionType });
      } else {
        // If user had a different reaction, remove it first
        if (previousReaction) {
          await removeReaction({ activityId, reactionType: previousReaction });
        }
        // Add new reaction
        await addReaction({ activityId, reactionType });
      }

      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 pt-3 border-t">
      {/* Reaction buttons */}
      {Object.entries(REACTION_TYPES).map(([type, { icon: Icon, label, color }]) => {
        const isActive = currentReaction === type;
        return (
          <Button
            key={type}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleReaction(type)}
            disabled={isPending}
            className={`gap-1 ${isActive ? '' : 'hover:bg-accent'}`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : color}`} />
            <span className="text-xs">{label}</span>
          </Button>
        );
      })}

      {/* Reaction breakdown */}
      {Object.keys(optimisticBreakdown).length > 0 && (
        <div className="flex items-center gap-2 ml-2">
          {Object.entries(optimisticBreakdown).map(([type, count]) => {
            const reactionInfo = REACTION_TYPES[type as keyof typeof REACTION_TYPES];
            if (!reactionInfo || count === 0) return null;
            const Icon = reactionInfo.icon;
            return (
              <div key={type} className="flex items-center gap-1 text-sm text-muted-foreground">
                <Icon className={`h-4 w-4 ${reactionInfo.color}`} />
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Comment button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        className="gap-1 ml-auto"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">
          {commentCount > 0 ? `${commentCount}` : 'Comment'}
        </span>
      </Button>
    </div>
  );
}
