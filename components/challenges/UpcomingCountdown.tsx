'use client';

import { Calendar } from 'lucide-react';
import { getDaysUntilStart, parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface UpcomingCountdownProps {
  startsAt: string;
}

export function UpcomingCountdown({ startsAt }: UpcomingCountdownProps) {
  const daysUntil = getDaysUntilStart(startsAt);
  const startDate = parseLocalDate(getLocalDateFromISO(startsAt));
  const startDateFormatted = startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="text-center py-6">
      <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-2xl font-bold mb-1">
        {daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${daysUntil} days`}
      </p>
      <p className="text-sm text-muted-foreground">
        Tracking begins on {startDateFormatted}
      </p>
    </div>
  );
}
