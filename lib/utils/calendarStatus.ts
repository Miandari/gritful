import { format, isSameDay, startOfDay } from 'date-fns';
import { getPeriodForDate, isPeriodEnded } from './periods';

/**
 * Day status for calendar display
 */
export type DayStatus =
  | 'outside'         // Not in challenge period or future
  | 'all_complete'    // Daily + period tasks all done (dark green)
  | 'completed'       // Daily done or period done (green)
  | 'partial'         // Some tasks done (light green)
  | 'late'            // Completed but submitted late (yellow)
  | 'period_pending'  // No daily tasks, period task available (blue)
  | 'today'           // Today, incomplete (blue outline)
  | 'missed';         // Deadline passed without completion (red)

export interface DailyEntry {
  entry_date: string;
  is_completed: boolean;
  submitted_at?: string;
  points_earned?: number;
  bonus_points?: number;
}

export interface PeriodicCompletion {
  task_id: string;
  frequency: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  completed_at: string;
  value: any;
}

export interface ChallengeMetric {
  id: string;
  name: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'onetime';
  // ... other fields
}

export interface GetDayStatusParams {
  day: Date;
  challengeStartDate: Date;
  challengeEndDate: Date | null;
  dailyEntry: DailyEntry | null;
  periodicCompletions: PeriodicCompletion[];
  metrics: ChallengeMetric[];
}

/**
 * Check if a period task was completed for the period containing the given day
 */
function checkPeriodCompletion(
  day: Date,
  frequency: 'weekly' | 'monthly',
  tasks: ChallengeMetric[],
  completions: PeriodicCompletion[]
): boolean {
  if (tasks.length === 0) return true; // No tasks = considered done

  const period = getPeriodForDate(frequency, day);
  const periodKey = format(period.start, 'yyyy-MM-dd');

  // Check if ALL tasks of this frequency are completed for this period
  return tasks.every(task => {
    return completions.some(
      c => c.task_id === task.id &&
           c.frequency === frequency &&
           c.period_start === periodKey
    );
  });
}

/**
 * Check if a period deadline has passed for a specific day
 */
function isPeriodDeadlinePassed(
  day: Date,
  frequency: 'weekly' | 'monthly'
): boolean {
  const period = getPeriodForDate(frequency, day);
  return isPeriodEnded(period);
}

/**
 * Calculate the status for a calendar day
 */
export function getDayStatus(params: GetDayStatusParams): DayStatus {
  const {
    day,
    challengeStartDate,
    challengeEndDate,
    dailyEntry,
    periodicCompletions,
    metrics,
  } = params;

  const dayMidnight = new Date(day);
  dayMidnight.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize challenge dates to midnight for accurate comparison
  const startMidnight = new Date(challengeStartDate);
  startMidnight.setHours(0, 0, 0, 0);

  const endMidnight = challengeEndDate ? new Date(challengeEndDate) : null;
  if (endMidnight) endMidnight.setHours(0, 0, 0, 0);

  const isToday = isSameDay(dayMidnight, today);
  const isPast = dayMidnight < today;
  const isFuture = dayMidnight > today;

  // Determine the max selectable date (can't select future dates beyond today)
  const maxDate = endMidnight && endMidnight < today ? endMidnight : today;

  // Outside challenge period
  if (dayMidnight < startMidnight || dayMidnight > maxDate) {
    return 'outside';
  }

  // Filter metrics by frequency
  const dailyTasks = metrics.filter(m => m.frequency === 'daily' || !m.frequency);
  const weeklyTasks = metrics.filter(m => m.frequency === 'weekly');
  const monthlyTasks = metrics.filter(m => m.frequency === 'monthly');

  const hasDailyTasks = dailyTasks.length > 0;
  const hasWeeklyTasks = weeklyTasks.length > 0;
  const hasMonthlyTasks = monthlyTasks.length > 0;

  // Check completion status
  const dailyDone = dailyEntry?.is_completed ?? false;
  const weeklyDone = hasWeeklyTasks
    ? checkPeriodCompletion(day, 'weekly', weeklyTasks, periodicCompletions)
    : true;
  const monthlyDone = hasMonthlyTasks
    ? checkPeriodCompletion(day, 'monthly', monthlyTasks, periodicCompletions)
    : true;

  // Check for late submission on daily entries
  const isLateSubmission = dailyEntry?.submitted_at && dailyEntry?.is_completed && dailyEntry?.entry_date &&
    (() => {
      const submittedDate = new Date(dailyEntry.submitted_at!);
      const submittedDateStr = `${submittedDate.getFullYear()}-${String(submittedDate.getMonth() + 1).padStart(2, '0')}-${String(submittedDate.getDate()).padStart(2, '0')}`;
      return submittedDateStr > dailyEntry.entry_date;
    })();

  // CASE 1: Challenge has daily tasks
  if (hasDailyTasks) {
    if (dailyDone) {
      // Check for late submission
      if (isLateSubmission) {
        return 'late';
      }
      // Check for "all complete" bonus (daily + all period tasks done)
      const allPeriodsDone = weeklyDone && monthlyDone;
      return allPeriodsDone ? 'all_complete' : 'completed';
    }

    // Daily entry exists but not completed = partial progress
    if (dailyEntry && !dailyEntry.is_completed) {
      return 'partial';
    }

    // No daily entry yet
    if (isToday) {
      return 'today';
    }

    // Past day with no daily completion = missed
    if (isPast) {
      return 'missed';
    }

    return 'outside';
  }

  // CASE 2: No daily tasks - use period task status
  const anyPeriodDone = weeklyDone || monthlyDone;
  const allPeriodsDone = weeklyDone && monthlyDone;

  if (allPeriodsDone && (hasWeeklyTasks || hasMonthlyTasks)) {
    return 'all_complete';
  }

  if (anyPeriodDone) {
    return 'completed';
  }

  // Check if any period deadline has passed without completion
  const weeklyMissed = hasWeeklyTasks &&
    isPeriodDeadlinePassed(day, 'weekly') &&
    !weeklyDone;
  const monthlyMissed = hasMonthlyTasks &&
    isPeriodDeadlinePassed(day, 'monthly') &&
    !monthlyDone;

  if (weeklyMissed || monthlyMissed) {
    return 'missed';
  }

  // Period tasks pending, deadline not passed yet
  if (hasWeeklyTasks || hasMonthlyTasks) {
    return 'period_pending';
  }

  // No tasks at all
  return 'outside';
}

/**
 * Get the CSS classes for a day status (background color)
 */
export function getDayStatusClasses(status: DayStatus): string {
  switch (status) {
    case 'all_complete':
      // Solid green background with glow - very distinct "perfect day" look
      return 'border-green-500 bg-green-500 dark:bg-green-600 ring-2 ring-green-400/50 dark:ring-green-400/40 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    case 'completed':
      return 'border-green-500 bg-green-500/10 dark:bg-green-500/20';
    case 'partial':
      return 'border-green-400 bg-green-400/10 dark:bg-green-400/20';
    case 'late':
      return 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20';
    case 'period_pending':
      return 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20';
    case 'today':
      return 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20';
    case 'missed':
      return 'border-red-400 bg-red-400/10 dark:bg-red-400/20';
    case 'outside':
    default:
      return 'border-border/50 bg-muted/50';
  }
}

/**
 * Get the icon color classes for a day status
 */
export function getDayStatusIconColor(status: DayStatus): string {
  switch (status) {
    case 'all_complete':
      return 'text-green-700 dark:text-green-300';
    case 'completed':
      return 'text-green-600 dark:text-green-400';
    case 'partial':
      return 'text-green-500 dark:text-green-400';
    case 'late':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'period_pending':
      return 'text-blue-600 dark:text-blue-400';
    case 'today':
      return 'text-blue-600 dark:text-blue-400';
    case 'missed':
      return 'text-red-500 dark:text-red-400';
    case 'outside':
    default:
      return 'text-muted-foreground/40';
  }
}
