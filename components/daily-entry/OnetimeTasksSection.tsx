'use client';

import { useMemo } from 'react';
import { OnetimeTaskInput } from './OnetimeTaskInput';
import { sortByDeadline } from '@/lib/utils/deadlines';
import { CheckCircle2 } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'duration' | 'choice' | 'text' | 'file';
  required: boolean;
  frequency?: string;
  deadline?: string;
  config?: any;
  points?: number;
}

interface Completion {
  task_id: string;
  completed_at: string;
  value: any;
}

interface OnetimeTasksSectionProps {
  tasks: Task[];
  participantId: string;
  challengeId: string;
  completions: Completion[];
}

export function OnetimeTasksSection({
  tasks,
  participantId,
  challengeId,
  completions,
}: OnetimeTasksSectionProps) {
  // Create a map of completions by task_id for quick lookup
  const completionMap = useMemo(() => {
    const map = new Map<string, Completion>();
    completions.forEach((c) => map.set(c.task_id, c));
    return map;
  }, [completions]);

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

    // Sort pending tasks by deadline (overdue first, then by date)
    const sortedPending = sortByDeadline(pending);

    // Sort completed tasks by completion date (most recent first)
    const sortedCompleted = [...completed].sort((a, b) => {
      const aCompletion = completionMap.get(a.id);
      const bCompletion = completionMap.get(b.id);
      if (!aCompletion || !bCompletion) return 0;
      return new Date(bCompletion.completed_at).getTime() - new Date(aCompletion.completed_at).getTime();
    });

    return { pendingTasks: sortedPending, completedTasks: sortedCompleted };
  }, [tasks, completionMap]);

  const totalCount = tasks.length;
  const completedCount = completedTasks.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">One-time Tasks</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} done
        </span>
      </div>

      {/* Description */}
      {pendingTasks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Complete these anytime during the challenge
        </p>
      )}

      {/* All completed message */}
      {pendingTasks.length === 0 && completedTasks.length > 0 && (
        <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-3 rounded-lg">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">All one-time tasks completed!</span>
        </div>
      )}

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <OnetimeTaskInput
              key={task.id}
              task={task}
              participantId={participantId}
              challengeId={challengeId}
              isCompleted={false}
            />
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          {pendingTasks.length > 0 && (
            <h4 className="text-sm font-medium text-muted-foreground mt-6">
              Completed
            </h4>
          )}
          {completedTasks.map((task) => {
            const completion = completionMap.get(task.id);
            return (
              <OnetimeTaskInput
                key={task.id}
                task={task}
                participantId={participantId}
                challengeId={challengeId}
                isCompleted={true}
                completedAt={completion?.completed_at}
                completedValue={completion?.value}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
