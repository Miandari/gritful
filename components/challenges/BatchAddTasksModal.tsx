'use client';

import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { batchAddTasks } from '@/app/actions/onetimeTasks';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { DEADLINE_PRESETS, calculateDeadline, type DeadlinePreset } from '@/lib/utils/deadlines';

interface BatchAddTasksModalProps {
  challengeId: string;
  challengeEndDate: string;
}

export function BatchAddTasksModal({ challengeId, challengeEndDate }: BatchAddTasksModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('end_of_week');

  // Parse task names from textarea
  const parseTaskNames = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const taskNames = parseTaskNames(taskText);
  const taskCount = taskNames.length;

  const handleSubmit = async () => {
    if (taskCount === 0) return;

    setIsSubmitting(true);
    try {
      // Calculate deadline from preset
      const deadline = calculateDeadline(deadlinePreset);
      const deadlineStr = deadline ? deadline.toISOString() : null;

      const result = await batchAddTasks(challengeId, taskNames, deadlineStr);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add tasks');
      }

      toast.success(`Added ${result.count} task${result.count === 1 ? '' : 's'}!`);
      setOpen(false);
      setTaskText('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ListPlus className="mr-2 h-4 w-4" />
          Batch Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Add Tasks</DialogTitle>
          <DialogDescription>
            Add multiple one-time tasks at once. Enter one task per line.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Select
              value={deadlinePreset}
              onValueChange={(value) => setDeadlinePreset(value as DeadlinePreset)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select deadline" />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_PRESETS.filter(p => p.value !== 'custom').map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tasks">Tasks (one per line)</Label>
            <Textarea
              id="tasks"
              placeholder="Read chapter 3&#10;Complete exercises 1-5&#10;Watch lecture video"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              rows={6}
              className="resize-none font-mono text-sm"
            />
            {taskCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Will create {taskCount} task{taskCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={taskCount === 0 || isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? 'Adding...' : `Add ${taskCount} Task${taskCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
