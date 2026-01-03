'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';

interface TodayStatusBadgeProps {
  recentEntries: { entry_date: string; is_completed: boolean }[];
}

export function TodayStatusBadge({ recentEntries }: TodayStatusBadgeProps) {
  // Compute today's date on CLIENT for correct user timezone
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Find today's entry
  const todayEntry = useMemo(
    () => recentEntries.find(e => e.entry_date === todayDate),
    [recentEntries, todayDate]
  );

  return todayEntry?.is_completed ? (
    <span className="text-green-600">Done</span>
  ) : (
    <span className="text-amber-600">Pending</span>
  );
}

export function useTodayEntry(recentEntries: { entry_date: string; is_completed: boolean }[]) {
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  return useMemo(
    () => recentEntries.find(e => e.entry_date === todayDate),
    [recentEntries, todayDate]
  );
}
