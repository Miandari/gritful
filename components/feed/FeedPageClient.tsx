'use client';

import { useEffect } from 'react';
import { ActivityFeed } from './ActivityFeed';
import { markActivityAsRead, type ActivityFeedItem } from '@/app/actions/activityFeed';

interface FeedPageClientProps {
  initialActivities: ActivityFeedItem[];
  challengeId: string;
  currentUserId: string;
  isCreator: boolean;
  isParticipant: boolean;
  total: number;
  hasMore: boolean;
}

export function FeedPageClient({
  initialActivities,
  challengeId,
  currentUserId,
  isCreator,
  isParticipant,
  total,
  hasMore,
}: FeedPageClientProps) {
  // Mark activities as read when the component mounts (client-side only)
  useEffect(() => {
    if (currentUserId) {
      markActivityAsRead({ challengeId }).catch((error) => {
        console.error('Error marking activities as read:', error);
      });
    }
  }, [challengeId, currentUserId]);

  return (
    <ActivityFeed
      initialActivities={initialActivities}
      challengeId={challengeId}
      currentUserId={currentUserId}
      isCreator={isCreator}
      isParticipant={isParticipant}
      total={total}
      hasMore={hasMore}
    />
  );
}
