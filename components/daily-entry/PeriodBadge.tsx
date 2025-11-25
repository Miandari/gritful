'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Period, getPeriodStatus, getDaysRemaining } from '@/lib/utils/periods';
import { format } from 'date-fns';

interface PeriodBadgeProps {
  period: Period;
  completedAt?: string | null;
  frequency: 'weekly' | 'monthly';
}

export function PeriodBadge({ period, completedAt, frequency }: PeriodBadgeProps) {
  // If completed, show completion date
  if (completedAt) {
    const completedDate = new Date(completedAt);
    return (
      <Badge
        variant="outline"
        className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Completed {format(completedDate, 'EEE, MMM d')}
      </Badge>
    );
  }

  const { status, text } = getPeriodStatus(period);
  const daysLeft = getDaysRemaining(period);

  // Period has ended without completion
  if (status === 'ended') {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
      >
        <AlertTriangle className="mr-1 h-3 w-3" />
        Missed
      </Badge>
    );
  }

  // Due today
  if (status === 'due_today') {
    return (
      <Badge
        variant="outline"
        className="bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      >
        <AlertTriangle className="mr-1 h-3 w-3" />
        {text}
      </Badge>
    );
  }

  // Due soon (1-2 days)
  if (status === 'due_soon') {
    return (
      <Badge
        variant="outline"
        className="bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      >
        <Clock className="mr-1 h-3 w-3" />
        {text}
      </Badge>
    );
  }

  // Upcoming - show due date
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      <Clock className="mr-1 h-3 w-3" />
      {text}
    </Badge>
  );
}
