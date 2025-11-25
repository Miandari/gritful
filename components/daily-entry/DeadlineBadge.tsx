'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getDeadlineStatus, getDeadlineText, DeadlineStatus } from '@/lib/utils/deadlines';
import { cn } from '@/lib/utils';

interface DeadlineBadgeProps {
  deadline?: string | null;
  completedAt?: string | null;
  className?: string;
}

export function DeadlineBadge({ deadline, completedAt, className }: DeadlineBadgeProps) {
  // If completed, show completion date
  if (completedAt) {
    const completedDate = new Date(completedAt);
    const formattedDate = completedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return (
      <Badge variant="outline" className={cn('text-green-600 border-green-600/30', className)}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed {formattedDate}
      </Badge>
    );
  }

  // No deadline
  if (!deadline) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        No deadline
      </Badge>
    );
  }

  const status = getDeadlineStatus(deadline);
  const text = getDeadlineText(deadline);

  const statusConfig: Record<DeadlineStatus, { variant: 'destructive' | 'warning' | 'secondary' | 'outline'; icon: typeof Clock; className: string }> = {
    overdue: {
      variant: 'destructive',
      icon: AlertTriangle,
      className: '',
    },
    due_today: {
      variant: 'warning',
      icon: AlertTriangle,
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400',
    },
    due_soon: {
      variant: 'warning',
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400',
    },
    upcoming: {
      variant: 'secondary',
      icon: Clock,
      className: '',
    },
    no_deadline: {
      variant: 'outline',
      icon: Clock,
      className: 'text-muted-foreground',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Use outline variant and apply custom classes for warning states
  // since shadcn Badge might not have a warning variant
  if (status === 'due_today' || status === 'due_soon') {
    return (
      <Badge variant="outline" className={cn(config.className, className)}>
        <Icon className="h-3 w-3 mr-1" />
        {text}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {text}
    </Badge>
  );
}
