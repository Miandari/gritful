'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Infinity, Target, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface ProgressStatsSectionProps {
  startsAt: string;
  endsAt: string | null;
  durationDays: number | null;
  myCompletedDays: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  onetimePoints: number;
  rank?: number;
  totalParticipants?: number;
}

export function ProgressStatsSection({
  startsAt,
  endsAt,
  durationDays,
  myCompletedDays,
  currentStreak,
  longestStreak,
  totalPoints,
  onetimePoints,
  rank,
  totalParticipants,
}: ProgressStatsSectionProps) {
  // Calculate totalDays and maxDays on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const challengeStartDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const totalDays = Math.ceil(
    (today.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const isOngoing = endsAt === null;
  const maxDays = isOngoing
    ? Math.max(totalDays, 0)
    : Math.min(totalDays, durationDays || 0);

  const completionRate = maxDays > 0 ? Math.round((myCompletedDays / maxDays) * 100) : 0;
  const daysLeft = isOngoing ? null : Math.max(0, (durationDays || 0) - maxDays);
  const remainingDays = maxDays - myCompletedDays;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {rank !== undefined && totalParticipants !== undefined && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Your Rank</div>
            <div className="text-2xl font-bold">#{rank}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">of {totalParticipants}</div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
          <div className="text-2xl font-bold">{totalPoints}</div>
          {onetimePoints > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-500">{onetimePoints} from one-time</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
          <div className="text-2xl font-bold">{currentStreak}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">days in a row</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Completion</div>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">{myCompletedDays}/{maxDays} days</div>
        </CardContent>
      </Card>
    </div>
  );
}
