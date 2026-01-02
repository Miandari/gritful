'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Infinity } from 'lucide-react';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface ChallengeStatsSectionProps {
  startsAt: string;
  endsAt: string | null;
  durationDays: number | null;
  completedDays: number;
  currentStreak: number;
  longestStreak: number;
}

export function ChallengeStatsSection({
  startsAt,
  endsAt,
  durationDays,
  completedDays,
  currentStreak,
  longestStreak,
}: ChallengeStatsSectionProps) {
  // Calculate totalDays on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const rawTotalDays = Math.ceil(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const isOngoing = endsAt === null;
  const totalDays = isOngoing
    ? Math.max(rawTotalDays, 0)
    : Math.min(Math.max(rawTotalDays, 0), durationDays || 0);

  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const daysLeft = Math.max(0, (durationDays || 0) - totalDays);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Completion</div>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="text-xs text-muted-foreground">{completedDays}/{totalDays} days</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Longest Streak</div>
          <div className="text-2xl font-bold">{longestStreak}</div>
          <div className="text-xs text-muted-foreground">personal best</div>
        </CardContent>
      </Card>
      {isOngoing ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Days</div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Infinity className="h-5 w-5" />
              {totalDays}
            </div>
            <div className="text-xs text-muted-foreground">ongoing</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Days Left</div>
            <div className="text-2xl font-bold">{daysLeft}</div>
            <div className="text-xs text-muted-foreground">to complete</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
