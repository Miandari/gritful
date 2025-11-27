'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  getDayStatus,
  getDayStatusClasses,
  DayStatus,
  DailyEntry,
  PeriodicCompletion,
  ChallengeMetric,
} from '@/lib/utils/calendarStatus';

interface ProgressCalendarProps {
  entries: DailyEntry[];
  periodicCompletions?: PeriodicCompletion[];
  metrics?: ChallengeMetric[];
  challengeStartDate: Date;
  challengeEndDate: Date;
}

export function ProgressCalendar({
  entries,
  periodicCompletions = [],
  metrics = [],
  challengeStartDate,
  challengeEndDate,
}: ProgressCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a map of dates to entries for quick lookup
  const entryMap = new Map(
    entries.map(entry => [entry.entry_date, entry])
  );

  const calculateDayStatus = (day: Date): DayStatus => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const entry = entryMap.get(dayStr) || null;

    // Check if day is in the future (beyond today)
    const dayMidnight = new Date(day);
    dayMidnight.setHours(0, 0, 0, 0);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    if (dayMidnight > todayMidnight) {
      return 'outside'; // Future days show as outside/neutral
    }

    return getDayStatus({
      day,
      challengeStartDate,
      challengeEndDate,
      dailyEntry: entry,
      periodicCompletions,
      metrics,
    });
  };

  const getDayPoints = (day: Date, status: DayStatus): number | null => {
    if (status === 'completed' || status === 'all_complete' || status === 'partial' || status === 'late' || status === 'missed') {
      const dayStr = format(day, 'yyyy-MM-dd');
      const entry = entryMap.get(dayStr);
      if (entry) {
        return (entry.points_earned || 0) + (entry.bonus_points || 0);
      }
      return 0; // Missed day = 0 points
    }
    return null; // Today, future, pending, or outside - no points to show
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pad the start of the month to align with day of week
  const firstDayOfMonth = monthDays[0].getDay();
  const paddedDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (firstDayOfMonth - i));
    return day;
  });

  const allDays = [...paddedDays, ...monthDays];

  return (
    <div className="bg-card rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Progress Calendar</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[120px] text-center font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground pb-2">
            {day}
          </div>
        ))}

        {allDays.map((day, index) => {
          const status = calculateDayStatus(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const points = getDayPoints(day, status);

          return (
            <div
              key={index}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-colors',
                !isCurrentMonth && 'opacity-50',
                getDayStatusClasses(status)
              )}
            >
              <span className={cn(
                'text-xs font-medium mb-0.5',
                !isCurrentMonth && 'text-muted-foreground/60',
                status === 'outside' && 'text-muted-foreground/40',
                status === 'all_complete' && 'text-white dark:text-white'
              )}>
                {format(day, 'd')}
              </span>
              {points !== null ? (
                <span className={cn(
                  'text-sm font-bold',
                  (status === 'completed' || status === 'partial') && 'text-green-600 dark:text-green-400',
                  status === 'all_complete' && 'text-white dark:text-white',
                  status === 'late' && 'text-yellow-600 dark:text-yellow-400',
                  status === 'missed' && 'text-red-600 dark:text-red-400'
                )}>
                  {points}
                </span>
              ) : status === 'outside' ? (
                <Minus className="h-4 w-4 text-muted-foreground/40" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-green-500 bg-green-500/10 dark:bg-green-500/20 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-green-600 dark:text-green-400">12</span>
          </div>
          <span>Done</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">8</span>
          </div>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 rounded" />
          <span>Today/Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-red-400 bg-red-400/10 dark:bg-red-400/20 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-red-600 dark:text-red-400">0</span>
          </div>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-border bg-card rounded" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
}