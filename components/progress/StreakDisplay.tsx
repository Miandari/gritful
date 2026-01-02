'use client';

import { Flame, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
  startsAt: string;
  endsAt: string | null;
  durationDays: number | null;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  completedDays,
  startsAt,
  endsAt,
  durationDays,
}: StreakDisplayProps) {
  // Calculate totalDays on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const challengeStartDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const rawTotalDays = Math.ceil(
    (today.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const isOngoing = endsAt === null;
  const totalDays = isOngoing
    ? Math.max(rawTotalDays, 0)
    : Math.min(Math.max(rawTotalDays, 0), durationDays || 0);

  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20">
            <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
            <p className="text-2xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">days in a row</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20">
            <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Longest Streak</p>
            <p className="text-2xl font-bold">{longestStreak}</p>
            <p className="text-xs text-muted-foreground">personal best</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 dark:bg-green-500/20">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">{completedDays}/{totalDays} days</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Total Days</p>
            <p className="text-2xl font-bold">{completedDays}</p>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}