/**
 * Deadline utility functions for one-time tasks
 */

import {
  endOfDay,
  endOfWeek,
  endOfMonth,
  addWeeks,
  addMonths,
  differenceInDays,
  differenceInHours,
  isPast,
  isToday,
  isTomorrow,
  format,
  parseISO,
} from 'date-fns';

export type DeadlinePreset =
  | 'none'
  | 'today'
  | 'end_of_week'
  | 'one_week'
  | 'end_of_month'
  | 'one_month'
  | 'custom';

export type DeadlineStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'no_deadline';

/**
 * Calculate a deadline date based on a preset option
 */
export function calculateDeadline(
  preset: DeadlinePreset,
  referenceDate: Date = new Date()
): Date | null {
  switch (preset) {
    case 'none':
      return null;
    case 'today':
      return endOfDay(referenceDate);
    case 'end_of_week':
      // Week ends on Sunday (weekStartsOn: 1 means Monday is first day)
      return endOfWeek(referenceDate, { weekStartsOn: 1 });
    case 'one_week':
      return endOfDay(addWeeks(referenceDate, 1));
    case 'end_of_month':
      return endOfMonth(referenceDate);
    case 'one_month':
      return endOfDay(addMonths(referenceDate, 1));
    case 'custom':
      // Custom dates are handled separately by the date picker
      return null;
    default:
      return null;
  }
}

/**
 * Get the status of a deadline for display purposes
 */
export function getDeadlineStatus(deadline: string | Date | null | undefined): DeadlineStatus {
  if (!deadline) {
    return 'no_deadline';
  }

  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const now = new Date();

  if (isPast(deadlineDate) && !isToday(deadlineDate)) {
    return 'overdue';
  }

  if (isToday(deadlineDate)) {
    return 'due_today';
  }

  const daysUntil = differenceInDays(deadlineDate, now);

  if (daysUntil <= 2) {
    return 'due_soon';
  }

  return 'upcoming';
}

/**
 * Get a human-readable string describing the deadline
 */
export function getDeadlineText(deadline: string | Date | null | undefined): string {
  if (!deadline) {
    return '';
  }

  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const now = new Date();
  const status = getDeadlineStatus(deadline);

  switch (status) {
    case 'overdue': {
      const daysOverdue = differenceInDays(now, deadlineDate);
      if (daysOverdue === 1) {
        return 'Overdue by 1 day';
      }
      return `Overdue by ${daysOverdue} days`;
    }
    case 'due_today':
      return 'Due today';
    case 'due_soon': {
      if (isTomorrow(deadlineDate)) {
        return 'Due tomorrow';
      }
      const hoursUntil = differenceInHours(deadlineDate, now);
      if (hoursUntil < 24) {
        return `Due in ${hoursUntil} hours`;
      }
      const daysUntil = differenceInDays(deadlineDate, now);
      return `Due in ${daysUntil} days`;
    }
    case 'upcoming': {
      const daysUntil = differenceInDays(deadlineDate, now);
      if (daysUntil <= 7) {
        return `Due in ${daysUntil} days`;
      }
      // Show the actual date for deadlines more than a week away
      return `Due ${format(deadlineDate, 'MMM d')}`;
    }
    default:
      return '';
  }
}

/**
 * Get the color variant for a deadline badge
 */
export function getDeadlineBadgeVariant(
  status: DeadlineStatus
): 'destructive' | 'warning' | 'secondary' | 'outline' {
  switch (status) {
    case 'overdue':
      return 'destructive';
    case 'due_today':
    case 'due_soon':
      return 'warning';
    case 'upcoming':
      return 'secondary';
    case 'no_deadline':
    default:
      return 'outline';
  }
}

/**
 * Get preset label for display
 */
export function getPresetLabel(preset: DeadlinePreset): string {
  switch (preset) {
    case 'none':
      return 'No deadline';
    case 'today':
      return 'Today';
    case 'end_of_week':
      return 'End of this week';
    case 'one_week':
      return '1 week from now';
    case 'end_of_month':
      return 'End of this month';
    case 'one_month':
      return '1 month from now';
    case 'custom':
      return 'Custom date...';
    default:
      return '';
  }
}

/**
 * All available deadline presets for the selector
 */
export const DEADLINE_PRESETS: { value: DeadlinePreset; label: string }[] = [
  { value: 'none', label: 'No deadline' },
  { value: 'today', label: 'Today' },
  { value: 'end_of_week', label: 'End of this week' },
  { value: 'one_week', label: '1 week from now' },
  { value: 'end_of_month', label: 'End of this month' },
  { value: 'one_month', label: '1 month from now' },
  { value: 'custom', label: 'Custom date...' },
];

/**
 * Sort tasks by deadline (overdue first, then by deadline date, then no deadline last)
 */
export function sortByDeadline<T extends { deadline?: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Tasks without deadlines go last
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;

    const statusA = getDeadlineStatus(a.deadline);
    const statusB = getDeadlineStatus(b.deadline);

    // Overdue tasks come first
    if (statusA === 'overdue' && statusB !== 'overdue') return -1;
    if (statusB === 'overdue' && statusA !== 'overdue') return 1;

    // Then sort by deadline date
    const dateA = parseISO(a.deadline);
    const dateB = parseISO(b.deadline);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Format a deadline for display in forms
 */
export function formatDeadlineForDisplay(deadline: string | Date | null | undefined): string {
  if (!deadline) return '';
  const date = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  return format(date, 'MMM d, yyyy');
}

/**
 * Clamp a deadline to not exceed the challenge end date
 */
export function clampDeadlineToChallenge(
  deadline: Date,
  challengeEndDate: Date | string
): Date {
  const endDate = typeof challengeEndDate === 'string' ? parseISO(challengeEndDate) : challengeEndDate;
  return deadline > endDate ? endDate : deadline;
}
