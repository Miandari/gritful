'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateDisplayStreak } from '@/lib/utils/dates';

interface TodaySummaryProps {
  activeChallenges: {
    participation_id: string;
    current_streak: number;
  }[];
  recentEntriesMap: Record<string, any[]>;
}

export function TodaySummary({ activeChallenges, recentEntriesMap }: TodaySummaryProps) {
  // Compute today's date string on the CLIENT for correct user timezone
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Count completed entries for today (in user's timezone)
  const completedTodayCount = activeChallenges.filter((challenge) => {
    const entries = recentEntriesMap[challenge.participation_id] || [];
    return entries.some(
      (entry) => entry.entry_date === todayDate && entry.is_completed
    );
  }).length;

  // Calculate total streaks from entries (not stored values which may be stale)
  const totalStreaks = useMemo(() => {
    return activeChallenges.reduce((sum, challenge) => {
      const entries = recentEntriesMap[challenge.participation_id] || [];
      const streak = calculateDisplayStreak(entries, todayDate);
      return sum + streak;
    }, 0);
  }, [activeChallenges, recentEntriesMap, todayDate]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Today&apos;s Tasks</h1>
        <p className="mt-2 text-muted-foreground">{todayFormatted}</p>
      </div>

      {activeChallenges.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Challenges</CardDescription>
              <CardTitle className="text-2xl">{activeChallenges.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed Today</CardDescription>
              <CardTitle className="text-2xl">
                {completedTodayCount}/{activeChallenges.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Current Streaks</CardDescription>
              <CardTitle className="text-2xl">{totalStreaks}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
    </>
  );
}
