'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreatorRibbon } from '@/components/challenges/CreatorBadge';
import { Infinity, Clock } from 'lucide-react';
import { ChallengeStateResult } from '@/lib/utils/challengeState';
import { cn } from '@/lib/utils';
import { parseLocalDate, getLocalDateFromISO, calculateDisplayStreak } from '@/lib/utils/dates';

interface ActiveChallengeCardProps {
  participation: {
    id: string;
    challenge_id: string;
    current_streak: number;
    longest_streak: number;
    total_points: number;
  };
  challenge: {
    id: string;
    name: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    duration_days: number | null;
    creator_id: string;
  };
  challengeState: ChallengeStateResult;
  recentEntries: { entry_date: string; is_completed: boolean }[];
  currentUserId: string;
}

export function ActiveChallengeCard({
  participation,
  challenge,
  challengeState,
  recentEntries,
  currentUserId,
}: ActiveChallengeCardProps) {
  // Compute today's date on CLIENT for correct user timezone
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Find today's entry from recent entries
  const todayEntry = useMemo(
    () => recentEntries.find(e => e.entry_date === todayDate) || null,
    [recentEntries, todayDate]
  );

  // Calculate display streak from entries (not stored value which may be stale)
  const displayStreak = useMemo(
    () => calculateDisplayStreak(recentEntries, todayDate),
    [recentEntries, todayDate]
  );

  // Calculate dates on CLIENT for correct user timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseLocalDate(getLocalDateFromISO(challenge.starts_at));

  const daysElapsed = Math.max(0, Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  const isOngoing = challenge.ends_at === null;
  const progress = isOngoing ? null : Math.min(100, (daysElapsed / (challenge.duration_days || 1)) * 100);

  const isCreator = challenge.creator_id === currentUserId;
  const isGracePeriod = challengeState?.state === 'grace_period';

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow hover:shadow-lg",
        isGracePeriod && "border-2 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
      )}
    >
      {isCreator && <CreatorRibbon showOngoing={isOngoing} />}
      <CardHeader className={isCreator ? 'pt-8' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {challenge.description || 'No description'}
            </CardDescription>
          </div>
          {isGracePeriod && (
            <Badge
              variant="outline"
              className="ml-2 shrink-0 flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-600"
            >
              <Clock className="h-3 w-3" />
              {challengeState.daysRemainingInGrace}d grace
            </Badge>
          )}
          {!isCreator && isOngoing && !isGracePeriod && (
            <Badge variant="outline" className="ml-2 shrink-0 flex items-center gap-1">
              <Infinity className="h-3 w-3" />
              Ongoing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{isOngoing ? 'Active' : 'Progress'}</span>
            <span className="font-medium">
              {isOngoing
                ? `Day ${daysElapsed + 1}`
                : `Day ${Math.min(daysElapsed + 1, challenge.duration_days || 1)} of ${challenge.duration_days}`
              }
            </span>
          </div>
          {!isOngoing && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Points</div>
              <div className="font-semibold">{participation.total_points}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Streak</div>
              <div className="font-semibold">{displayStreak}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Today</div>
              <div className="font-semibold">
                {todayEntry?.is_completed ? (
                  <span className="text-green-600">Done</span>
                ) : (
                  <span className="text-amber-600">Pending</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button asChild size="sm" className="flex-1">
              <Link href={`/challenges/${challenge.id}`}>View</Link>
            </Button>
            {!todayEntry?.is_completed && (
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href="/dashboard/today">Track Today</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
