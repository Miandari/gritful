'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PeriodicTaskInput } from './PeriodicTaskInput';
import { getCurrentWeek, getCurrentMonth, Period, formatPeriodKey } from '@/lib/utils/periods';
import type { PeriodicTaskCompletion } from '@/lib/validations/challenge';

interface Task {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'duration' | 'choice' | 'text' | 'file';
  required: boolean;
  config?: any;
  points?: number;
}

interface PeriodicTasksSectionProps {
  tasks: Task[];
  frequency: 'weekly' | 'monthly';
  participantId: string;
  challengeId: string;
  completions: PeriodicTaskCompletion[];
}

export function PeriodicTasksSection({
  tasks,
  frequency,
  participantId,
  challengeId,
  completions,
}: PeriodicTasksSectionProps) {
  // Get current period
  const currentPeriod: Period = useMemo(() => {
    return frequency === 'weekly' ? getCurrentWeek() : getCurrentMonth();
  }, [frequency]);

  const periodKey = formatPeriodKey(currentPeriod);

  // Create a map of completions for current period
  const completionMap = useMemo(() => {
    const map = new Map<string, PeriodicTaskCompletion>();
    completions.forEach((completion) => {
      // Only include completions for the current period
      if (completion.period_start === periodKey) {
        map.set(completion.task_id, completion);
      }
    });
    return map;
  }, [completions, periodKey]);

  // Separate completed and pending tasks
  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending: Task[] = [];
    const completed: Task[] = [];

    tasks.forEach((task) => {
      if (completionMap.has(task.id)) {
        completed.push(task);
      } else {
        pending.push(task);
      }
    });

    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks, completionMap]);

  // Count for display
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  if (tasks.length === 0) {
    return null;
  }

  const title = frequency === 'weekly' ? 'Weekly Tasks' : 'Monthly Tasks';
  const description = frequency === 'weekly'
    ? 'Complete once per week (resets Monday)'
    : 'Complete once per month';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} done
        </span>
      </div>

      {/* All tasks completed message */}
      {pendingTasks.length === 0 && completedTasks.length > 0 && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 py-2">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">
            All {frequency} tasks complete for {currentPeriod.label}!
          </span>
        </div>
      )}

      {/* Pending tasks */}
      {pendingTasks.map((task) => (
        <PeriodicTaskInput
          key={task.id}
          task={task}
          participantId={participantId}
          challengeId={challengeId}
          frequency={frequency}
          currentPeriod={currentPeriod}
          isCompletedThisPeriod={false}
        />
      ))}

      {/* Completed tasks */}
      {completedTasks.length > 0 && pendingTasks.length > 0 && (
        <h4 className="text-sm font-medium text-muted-foreground mt-4">Completed</h4>
      )}
      {completedTasks.map((task) => {
        const completion = completionMap.get(task.id);
        return (
          <PeriodicTaskInput
            key={task.id}
            task={task}
            participantId={participantId}
            challengeId={challengeId}
            frequency={frequency}
            currentPeriod={currentPeriod}
            isCompletedThisPeriod={true}
            completedAt={completion?.completed_at}
            completedValue={completion?.value}
          />
        );
      })}
    </div>
  );
}
