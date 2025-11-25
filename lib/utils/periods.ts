import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, differenceInDays } from 'date-fns';

export interface Period {
  start: Date;
  end: Date;
  label: string;  // "Week of Jan 20" or "January 2025"
  key: string;    // "2025-01-20" (period_start as YYYY-MM-DD)
}

/**
 * Get the current week period (Monday to Sunday)
 */
export function getCurrentWeek(date: Date = new Date()): Period {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });     // Sunday
  return {
    start,
    end,
    label: `Week of ${format(start, 'MMM d')}`,
    key: format(start, 'yyyy-MM-dd'),
  };
}

/**
 * Get the current month period (1st to last day)
 */
export function getCurrentMonth(date: Date = new Date()): Period {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    start,
    end,
    label: format(start, 'MMMM yyyy'),
    key: format(start, 'yyyy-MM-dd'),
  };
}

/**
 * Get the appropriate period for a task based on its frequency
 */
export function getPeriodForDate(frequency: 'weekly' | 'monthly', date: Date = new Date()): Period {
  return frequency === 'weekly' ? getCurrentWeek(date) : getCurrentMonth(date);
}

/**
 * Check if a date falls within a period
 */
export function isDateInPeriod(date: Date, period: Period): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(period.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(period.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

/**
 * Get days remaining in a period
 */
export function getDaysRemaining(period: Period): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(period.end);
  end.setHours(23, 59, 59, 999);

  if (now > end) return 0;
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a period has ended
 */
export function isPeriodEnded(period: Period): boolean {
  const now = new Date();
  const end = new Date(period.end);
  end.setHours(23, 59, 59, 999);
  return now > end;
}

/**
 * Check if today is the last day of the period
 */
export function isDueToday(period: Period): boolean {
  const now = new Date();
  const end = new Date(period.end);
  return (
    now.getFullYear() === end.getFullYear() &&
    now.getMonth() === end.getMonth() &&
    now.getDate() === end.getDate()
  );
}

/**
 * Get a human-readable status for the period
 */
export function getPeriodStatus(period: Period): {
  status: 'ended' | 'due_today' | 'due_soon' | 'upcoming';
  text: string;
} {
  const daysLeft = getDaysRemaining(period);

  if (isPeriodEnded(period)) {
    return { status: 'ended', text: 'Period ended' };
  }

  if (isDueToday(period)) {
    return { status: 'due_today', text: 'Due today' };
  }

  if (daysLeft <= 2) {
    return {
      status: 'due_soon',
      text: daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days left`
    };
  }

  // Format the due date
  const end = new Date(period.end);
  const dayName = format(end, 'EEEE'); // "Sunday", "Tuesday", etc.
  const dateStr = format(end, 'MMM d'); // "Jan 31"

  return {
    status: 'upcoming',
    text: `Due ${dayName === 'Sunday' ? 'Sunday' : dateStr}`
  };
}

/**
 * Format period start date for database storage
 */
export function formatPeriodKey(period: Period): string {
  return format(period.start, 'yyyy-MM-dd');
}

/**
 * Format period end date for database storage
 */
export function formatPeriodEnd(period: Period): string {
  return format(period.end, 'yyyy-MM-dd');
}
