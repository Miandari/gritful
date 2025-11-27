'use client';

import { useState } from 'react';
import { type ActivityFeedItem, getActivityFeed } from '@/app/actions/activityFeed';
import { EntryLogCard } from './cards/EntryLogCard';
import { SocialPostCard } from './cards/SocialPostCard';
import { MilestoneCard } from './cards/MilestoneCard';
import { AchievementCard } from './cards/AchievementCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ActivityFeedProps {
  initialActivities: ActivityFeedItem[];
  challengeId: string;
  currentUserId: string;
  isCreator: boolean;
  isParticipant: boolean;
  total: number;
  hasMore: boolean;
}

export function ActivityFeed({
  initialActivities,
  challengeId,
  currentUserId,
  isCreator,
  isParticipant,
  total,
  hasMore: initialHasMore,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>(initialActivities);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const result = await getActivityFeed({
        challengeId,
        limit: 20,
        offset: activities.length,
      });

      if (result.activities) {
        setActivities((prev) => [...prev, ...result.activities]);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActivityCard = (activity: ActivityFeedItem) => {
    const key = activity.id;

    switch (activity.activity_type) {
      case 'entry_log':
        return (
          <EntryLogCard
            key={key}
            activity={activity}
            currentUserId={currentUserId}
          />
        );

      case 'social_post':
        return (
          <SocialPostCard
            key={key}
            activity={activity}
            currentUserId={currentUserId}
          />
        );

      case 'streak_milestone':
        return (
          <MilestoneCard
            key={key}
            activity={activity}
            currentUserId={currentUserId}
          />
        );

      case 'join_challenge':
        return (
          <SocialPostCard
            key={key}
            activity={activity}
            currentUserId={currentUserId}
          />
        );

      case 'achievement_earned':
        return (
          <AchievementCard
            key={key}
            activity={activity}
            currentUserId={currentUserId}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Activity items */}
      {activities.map((activity) => renderActivityCard(activity))}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          You've reached the beginning of the feed
        </div>
      )}
    </div>
  );
}
