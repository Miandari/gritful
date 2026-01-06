'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, Infinity, ArrowUpRight } from 'lucide-react';
import { ChallengeStateResult } from '@/lib/utils/challengeState';
import { cn } from '@/lib/utils';
import { parseLocalDate, getLocalDateFromISO, calculateDisplayStreak } from '@/lib/utils/dates';
import DailyEntryForm from '@/components/daily-entry/DailyEntryForm';

interface TodayChallengeCardProps {
  challenge: {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string | null;
    duration_days: number | null;
    participation_id: string;
    current_streak: number;
    metrics: any;
    enable_streak_bonus?: boolean;
    streak_bonus_points?: number;
    enable_perfect_day_bonus?: boolean;
    perfect_day_bonus_points?: number;
  };
  // Array of recent entries - client will filter to find today's entry
  recentEntries: {
    entry_date: string;
    is_completed: boolean;
    is_locked: boolean;
    [key: string]: any;
  }[];
  challengeState: ChallengeStateResult;
  onetimeCompletions: any[];
  periodicCompletions: any[];
}

export function TodayChallengeCard({
  challenge,
  recentEntries,
  challengeState,
  onetimeCompletions,
  periodicCompletions,
}: TodayChallengeCardProps) {
  // Compute today's date on the CLIENT for correct user timezone
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Find today's entry from the recent entries array
  const entry = useMemo(
    () => recentEntries.find((e) => e.entry_date === todayDate) || null,
    [recentEntries, todayDate]
  );

  const isCompleted = entry?.is_completed;
  const isLocked = entry?.is_locked;
  const isGracePeriod = challengeState?.state === 'grace_period';
  const isOngoing = challenge.ends_at === null;

  // Calculate display streak from entries (not stored value which may be stale)
  const displayStreak = useMemo(
    () => calculateDisplayStreak(recentEntries, todayDate),
    [recentEntries, todayDate]
  );

  // Calculate days elapsed on CLIENT for correct timezone
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const challengeStart = parseLocalDate(getLocalDateFromISO(challenge.starts_at));
  const daysElapsed = Math.floor(
    (todayMidnight.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className={cn(
        isCompleted && 'border-green-500 border-2',
        isGracePeriod && !isCompleted && 'border-2 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              <Link
                href={`/challenges/${challenge.id}`}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors group w-fit underline-offset-4 hover:underline"
              >
                {challenge.name}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </CardTitle>
            <CardDescription className="mt-1">
              {isOngoing ? (
                <span className="flex items-center gap-1">
                  <Infinity className="h-3 w-3" />
                  Day {daysElapsed + 1}
                </span>
              ) : (
                `Day ${Math.min(daysElapsed + 1, challenge.duration_days || 1)} of ${challenge.duration_days}`
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isGracePeriod && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-600"
              >
                <Clock className="mr-1 h-3 w-3" />
                {challengeState.daysRemainingInGrace}d grace
              </Badge>
            )}
            <Badge variant="secondary">{displayStreak} day streak</Badge>
            {isCompleted && (
              <Badge variant="default" className="bg-green-600 dark:bg-green-600">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
            {isLocked && (
              <Badge variant="secondary">
                Locked
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isCompleted && isLocked ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You&apos;ve completed today&apos;s entry and it&apos;s now locked. Great job!
            </AlertDescription>
          </Alert>
        ) : (
          <DailyEntryForm
            challenge={challenge}
            participationId={challenge.participation_id}
            existingEntry={entry}
            isLocked={isLocked}
            targetDate={todayDate}
            onetimeCompletions={onetimeCompletions}
            periodicCompletions={periodicCompletions}
          />
        )}
      </CardContent>
    </Card>
  );
}
