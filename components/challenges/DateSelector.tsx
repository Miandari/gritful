'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle, CheckCircle2, XCircle, Clock, Minus, Circle } from 'lucide-react';
import { useState } from 'react';
import {
  getDayStatus,
  getDayStatusClasses,
  DayStatus,
  DailyEntry,
  PeriodicCompletion,
  ChallengeMetric,
} from '@/lib/utils/calendarStatus';
import { parseLocalDate } from '@/lib/utils/dates';

interface DateSelectorProps {
  challengeStartDate: Date;
  challengeEndDate: Date;
  entries: DailyEntry[];
  periodicCompletions?: PeriodicCompletion[];
  metrics?: ChallengeMetric[];
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

export function DateSelector({
  challengeStartDate,
  challengeEndDate,
  entries,
  periodicCompletions = [],
  metrics = [],
  onDateSelect,
  selectedDate,
}: DateSelectorProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = today < challengeEndDate ? today : challengeEndDate;

  // Use parseLocalDate to correctly handle YYYY-MM-DD strings in local timezone
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? parseLocalDate(selectedDate) : today);

  const entryMap = new Map(entries.map(e => [e.entry_date, e]));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const calculateDayStatus = (day: Date): DayStatus => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const entry = entryMap.get(dayStr) || null;

    return getDayStatus({
      day,
      challengeStartDate,
      challengeEndDate,
      dailyEntry: entry,
      periodicCompletions,
      metrics,
    });
  };

  const getDayIcon = (status: DayStatus) => {
    switch (status) {
      case 'all_complete':
        return <CheckCircle2 className="h-3 w-3 text-white" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />;
      case 'partial':
        return <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />;
      case 'late':
        return <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />;
      case 'period_pending':
        return <Circle className="h-3 w-3 text-blue-600 dark:text-blue-400" />;
      case 'today':
        return <div className="h-3 w-3 rounded-full border-2 border-blue-600 dark:border-blue-400" />;
      case 'missed':
        return <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />;
      case 'outside':
        return <Minus className="h-2 w-2 text-muted-foreground/40" />;
      default:
        return null;
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pad the start of the month
  const firstDayOfMonth = monthDays[0].getDay();
  const paddedDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (firstDayOfMonth - i));
    return day;
  });

  const allDays = [...paddedDays, ...monthDays];

  const canNavigatePrev = () => {
    const prevMonth = subDays(monthStart, 1);
    return prevMonth >= challengeStartDate;
  };

  const canNavigateNext = () => {
    const nextMonth = addDays(monthEnd, 1);
    return nextMonth <= maxDate;
  };

  return (
    <Card className="max-w-[280px]">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Select Day</h3>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(subDays(currentMonth, 30))}
              disabled={!canNavigatePrev()}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="min-w-[70px] text-center text-[11px] font-medium">
              {format(currentMonth, 'MMM yy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
              disabled={!canNavigateNext()}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day.slice(0, 2)}
            </div>
          ))}

          {allDays.map((day, index) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const status = calculateDayStatus(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate === dayStr;
            const entry = entryMap.get(dayStr);
            const points = entry ? (entry.points_earned || 0) + (entry.bonus_points || 0) : 0;
            const isClickable = status !== 'outside';

            return (
              <button
                key={index}
                onClick={() => isClickable && onDateSelect(dayStr)}
                disabled={!isClickable}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded border transition-all text-[10px]',
                  !isCurrentMonth && 'opacity-40',
                  isClickable && 'hover:shadow-sm cursor-pointer',
                  !isClickable && 'cursor-not-allowed',
                  isSelected && 'ring-1 ring-primary',
                  getDayStatusClasses(status)
                )}
              >
                <span className={cn(
                  'font-medium',
                  !isCurrentMonth && 'text-muted-foreground/60',
                  status === 'outside' && 'text-muted-foreground/40',
                  status === 'all_complete' && 'text-white dark:text-white'
                )}>
                  {format(day, 'd')}
                </span>
                {points > 0 ? (
                  <span className={cn(
                    'font-bold',
                    (status === 'completed' || status === 'partial') && 'text-green-600 dark:text-green-400',
                    status === 'all_complete' && 'text-white dark:text-white',
                    status === 'late' && 'text-yellow-600 dark:text-yellow-400'
                  )}>
                    {points}
                  </span>
                ) : (
                  <div>
                    {getDayIcon(status)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mt-2 text-[9px] flex-wrap">
          <div className="flex items-center gap-0.5">
            <CheckCircle className="h-2 w-2 text-green-600 dark:text-green-400" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="h-2 w-2 text-yellow-600 dark:text-yellow-400" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2 w-2 rounded-full border border-blue-600 dark:border-blue-400" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Circle className="h-2 w-2 text-blue-600 dark:text-blue-400" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-0.5">
            <XCircle className="h-2 w-2 text-red-500 dark:text-red-400" />
            <span>Miss</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
