'use client';

import { format } from 'date-fns';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface ProgressTimelineCardsProps {
  startsAt: string;
  endsAt: string | null;
  durationDays: number | null;
  completedDays: number;
  longestStreak: number;
  status: string;
  onetimeTasksCompleted: number;
  onetimeTasksTotal: number;
}

export function ProgressTimelineCards({
  startsAt,
  endsAt,
  durationDays,
  completedDays,
  longestStreak,
  status,
  onetimeTasksCompleted,
  onetimeTasksTotal,
}: ProgressTimelineCardsProps) {
  // Calculate maxDays on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const challengeStartDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const rawTotalDays = Math.ceil(
    (today.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const isOngoing = endsAt === null;
  const maxDays = isOngoing
    ? Math.max(rawTotalDays, 0)
    : Math.min(Math.max(rawTotalDays, 0), durationDays || 0);

  const daysRemaining = isOngoing ? null : Math.max(0, (durationDays || 0) - maxDays);
  const missedDays = maxDays - completedDays;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg bg-card p-4 sm:p-6 shadow">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Challenge Timeline</h3>
        <div className="space-y-3">
          <div className="flex justify-between gap-2 text-sm sm:text-base">
            <span className="text-muted-foreground shrink-0">Started</span>
            <span className="font-medium text-right">
              {format(challengeStartDate, 'MMM d, yyyy')}
            </span>
          </div>
          {endsAt && (
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground shrink-0">Ends</span>
              <span className="font-medium text-right">
                {format(parseLocalDate(getLocalDateFromISO(endsAt)), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          {daysRemaining !== null && (
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground shrink-0">Days Remaining</span>
              <span className="font-medium">{daysRemaining}</span>
            </div>
          )}
          {isOngoing && (
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground shrink-0">Active Days</span>
              <span className="font-medium">{maxDays}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-card p-4 sm:p-6 shadow">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Performance Metrics</h3>
        <div className="space-y-3">
          <div className="flex justify-between gap-2 text-sm sm:text-base">
            <span className="text-muted-foreground shrink-0">Perfect Weeks</span>
            <span className="font-medium">
              {Math.floor(longestStreak / 7)}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-sm sm:text-base">
            <span className="text-muted-foreground shrink-0">Missed Days</span>
            <span className="font-medium">{missedDays}</span>
          </div>
          {onetimeTasksTotal > 0 && (
            <div className="flex justify-between gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground shrink-0">One-time Tasks</span>
              <span className="font-medium">
                {onetimeTasksCompleted}/{onetimeTasksTotal}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-2 text-sm sm:text-base">
            <span className="text-muted-foreground shrink-0">Status</span>
            <span className="font-medium capitalize">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
