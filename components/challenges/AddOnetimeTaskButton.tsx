'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskBuilder } from '@/components/challenges/create/TaskBuilder';
import { addTaskToChallenge } from '@/app/actions/onetimeTasks';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AddTaskButtonProps {
  challengeId: string;
  challengeEndDate: string;
}

export function AddTaskButton({ challengeId, challengeEndDate }: AddTaskButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (metric: any) => {
    setIsSubmitting(true);
    try {
      const result = await addTaskToChallenge(
        challengeId,
        {
          name: metric.name,
          type: metric.type,
          required: metric.required ?? true,
          config: metric.config,
          points: metric.points ?? 1,
          frequency: metric.frequency || 'onetime',
          deadline: metric.deadline,
          starts_at: new Date().toISOString(),
          ends_at: metric.ends_at || challengeEndDate,
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to add task');
      }

      toast.success('Task added successfully!');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Create a new task for participants. Choose frequency and how long it runs.
          </DialogDescription>
        </DialogHeader>
        <TaskBuilder
          metric={{ type: 'boolean', frequency: 'onetime' }}
          onSave={handleSave}
          onCancel={() => setOpen(false)}
          challengeEndDate={challengeEndDate}
          isMidChallengeTask={true}
        />
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compatibility
export { AddTaskButton as AddOnetimeTaskButton };
