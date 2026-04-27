'use client';

import { Badge } from '@/components/ui/badge';
import { getDaysUntilStart } from '@/lib/utils/dates';

interface UpcomingBadgeProps {
  startsAt: string;
}

export function UpcomingBadge({ startsAt }: UpcomingBadgeProps) {
  const daysUntil = getDaysUntilStart(startsAt);

  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
      {daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${daysUntil} days`}
    </Badge>
  );
}
