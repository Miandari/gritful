'use client';

import { AchievementGrid } from '@/components/achievements/AchievementGrid';
import { calculateProgress } from '@/lib/achievements/progress';
import type { Achievement, AchievementWithProgress, ParticipantStats } from '@/lib/achievements/types';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface AchievementsContentProps {
  achievements: Achievement[];
  earnedMap: Record<string, string>; // achievement_id -> earned_at
  baseStats: Omit<ParticipantStats, 'completionRate'>;
  completedEntriesCount: number;
  startsAt: string;
  endsAt: string | null;
  durationDays: number | null;
}

export function AchievementsContent({
  achievements,
  earnedMap,
  baseStats,
  completedEntriesCount,
  startsAt,
  endsAt,
  durationDays,
}: AchievementsContentProps) {
  // Calculate completionRate on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const endDate = endsAt ? parseLocalDate(getLocalDateFromISO(endsAt)) : null;
  const effectiveEnd = endDate && endDate < today ? endDate : today;

  const totalDays = Math.max(
    1,
    Math.floor((effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // For ongoing challenges, cap totalDays to actual elapsed days
  const isOngoing = endsAt === null;
  const cappedTotalDays = isOngoing
    ? totalDays
    : Math.min(totalDays, durationDays || totalDays);

  const completionRate = Math.round((completedEntriesCount / cappedTotalDays) * 100);

  // Build full stats with correct completionRate
  const stats: ParticipantStats = {
    ...baseStats,
    completionRate,
  };

  // Build achievements with progress
  const earnedMapObj = new Map(Object.entries(earnedMap));
  const achievementsWithProgress: AchievementWithProgress[] = achievements.map(
    (achievement: Achievement) => {
      const earned = earnedMapObj.has(achievement.id);
      const earned_at = earnedMapObj.get(achievement.id);
      const progress = !earned ? calculateProgress(achievement, stats) : undefined;

      return {
        ...achievement,
        earned,
        earned_at,
        progress,
      };
    }
  );

  // Sort by display_order
  achievementsWithProgress.sort((a, b) => a.display_order - b.display_order);

  const earnedCount = achievementsWithProgress.filter(a => a.earned).length;
  const totalCount = achievementsWithProgress.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Achievements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {earnedCount} of {totalCount} earned
          </p>
        </div>
      </div>

      {/* Achievement Grid */}
      <AchievementGrid
        achievements={achievementsWithProgress}
        showProgress={true}
        size="md"
      />
    </div>
  );
}
