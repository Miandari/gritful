'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Calendar, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DayDetailModal } from './DayDetailModal';
import EmailParticipantButton from '@/components/challenges/EmailParticipantButton';

interface DailyEntry {
  entry_date: string;
  is_completed: boolean;
  points_earned?: number;
  bonus_points?: number;
  submitted_at?: string;
  metric_data?: any;
  notes?: string;
}

interface Participant {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  profile: {
    username: string;
    avatar_url: string | null;
  };
  completedDays: number;
  totalDays: number;
  lastActivity: string | null;
  entries: DailyEntry[];
}

interface ParticipantDetailModalProps {
  participant: Participant;
  currentUserId: string;
  challengeId: string;
  challengeName: string;
  challengeCreatorId: string;
  challengeStartDate: Date;
  challengeEndDate: Date;
  challengeMetrics: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function ParticipantDetailModal({
  participant,
  currentUserId,
  challengeId,
  challengeName,
  challengeCreatorId,
  challengeStartDate,
  challengeEndDate,
  challengeMetrics,
  isOpen,
  onClose
}: ParticipantDetailModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ date: Date; entry: DailyEntry | null } | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a map of dates to entries for quick lookup
  const entryMap = new Map(
    participant.entries.map(entry => [entry.entry_date, entry])
  );

  const getDayStatus = (day: Date): 'completed' | 'late' | 'missed' | 'today' | 'future' | 'outside' => {
    const dayStr = format(day, 'yyyy-MM-dd');

    const dayMidnight = new Date(day);
    dayMidnight.setHours(0, 0, 0, 0);

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const startMidnight = new Date(challengeStartDate);
    startMidnight.setHours(0, 0, 0, 0);

    const endMidnight = new Date(challengeEndDate);
    endMidnight.setHours(0, 0, 0, 0);

    if (dayMidnight < startMidnight || dayMidnight > endMidnight) {
      return 'outside';
    }

    if (dayMidnight > todayMidnight) {
      return 'future';
    }

    if (dayMidnight.getTime() === todayMidnight.getTime()) {
      const entry = entryMap.get(dayStr);
      if (entry?.is_completed) {
        return 'completed';
      }
      return 'today';
    }

    const entry = entryMap.get(dayStr);
    if (entry?.is_completed) {
      if (entry.submitted_at) {
        const submittedDate = new Date(entry.submitted_at);
        submittedDate.setHours(0, 0, 0, 0);
        if (submittedDate.getTime() > dayMidnight.getTime()) {
          return 'late';
        }
      }
      return 'completed';
    }

    return 'missed';
  };

  const getDayPoints = (day: Date, status: string): number | null => {
    if (status === 'completed' || status === 'late' || status === 'missed') {
      const dayStr = format(day, 'yyyy-MM-dd');
      const entry = entryMap.get(dayStr);
      if (entry) {
        return (entry.points_earned || 0) + (entry.bonus_points || 0);
      }
      return 0;
    }
    return null;
  };

  const handleDayClick = (day: Date, status: string) => {
    // Only allow clicking on days within challenge period and not in future
    if (status === 'outside' || status === 'future') {
      return;
    }

    const dayStr = format(day, 'yyyy-MM-dd');
    const entry = entryMap.get(dayStr) || null;
    setSelectedDay({ date: day, entry });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayOfMonth = monthDays[0].getDay();
  const paddedDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (firstDayOfMonth - i));
    return day;
  });

  const allDays = [...paddedDays, ...monthDays];

  const completionRate = participant.totalDays > 0
    ? Math.round((participant.completedDays / participant.totalDays) * 100)
    : 0;

  const isCreator = currentUserId === challengeCreatorId;
  const isNotSelf = participant.user_id !== currentUserId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl">
                  {participant.profile.username || 'Unknown User'}
                </DialogTitle>
                <DialogDescription>
                  View their progress and activity
                </DialogDescription>
              </div>
              {isCreator && isNotSelf && (
                <EmailParticipantButton
                  challengeId={challengeId}
                  challengeName={challengeName}
                  participantUserId={participant.user_id}
                  participantUsername={participant.profile.username || 'this participant'}
                />
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-lg p-4 border border-blue-500/20">
                <div className="text-sm text-muted-foreground mb-1">Total Points</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {participant.total_points || 0}
                </div>
              </div>
              <div className="bg-orange-500/10 dark:bg-orange-500/20 rounded-lg p-4 border border-orange-500/20">
                <div className="text-sm text-muted-foreground mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {participant.current_streak}
                </div>
              </div>
              <div className="bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-sm text-muted-foreground mb-1">Longest Streak</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {participant.longest_streak}
                </div>
              </div>
              <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-4 border border-green-500/20">
                <div className="text-sm text-muted-foreground mb-1">Completion</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completionRate}%
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-card rounded-lg border p-6">
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
                  const status = getDayStatus(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const points = getDayPoints(day, status);
                  const isClickable = status !== 'outside' && status !== 'future';

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day, status)}
                      className={cn(
                        'aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-colors',
                        !isCurrentMonth && 'opacity-50',
                        isClickable && 'cursor-pointer hover:ring-2 hover:ring-primary',
                        status === 'completed' && 'border-green-500 bg-green-500/10 dark:bg-green-500/20',
                        status === 'late' && 'border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20',
                        status === 'missed' && 'border-red-400 bg-red-400/10 dark:bg-red-400/20',
                        status === 'today' && 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
                        status === 'future' && 'border-border bg-card',
                        status === 'outside' && 'border-border/50 bg-muted/50'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium mb-0.5',
                        !isCurrentMonth && 'text-muted-foreground/60',
                        status === 'outside' && 'text-muted-foreground/40'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {points !== null ? (
                        <span className={cn(
                          'text-sm font-bold',
                          status === 'completed' && 'text-green-600 dark:text-green-400',
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
                  <span>On Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/20 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">8</span>
                  </div>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 rounded" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-red-400 bg-red-400/10 dark:bg-red-400/20 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">0</span>
                  </div>
                  <span>Missed</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-center text-muted-foreground">
                Click on any day to view details
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedDay && (
        <DayDetailModal
          date={selectedDay.date}
          entry={selectedDay.entry}
          username={participant.profile.username || 'Unknown User'}
          participantUserId={participant.user_id}
          currentUserId={currentUserId}
          challengeId={challengeId}
          challengeMetrics={challengeMetrics}
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
