'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, ChevronDown, ChevronUp, Loader2, ArrowUpRight } from 'lucide-react';
import { DeadlineBadge } from './DeadlineBadge';
import { saveOnetimeTaskCompletion } from '@/app/actions/onetimeTasks';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/ui/file-upload';
import Link from 'next/link';

interface Task {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'duration' | 'choice' | 'text' | 'file';
  required: boolean;
  config?: {
    min?: number;
    max?: number;
    options?: string[];
    allowMultiple?: boolean;
    maxLength?: number;
    placeholder?: string;
  };
  points?: number;
  deadline?: string;
}

interface OnetimeTaskInputProps {
  task: Task;
  participantId: string;
  challengeId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  completedValue?: any;
}

export function OnetimeTaskInput({
  task,
  participantId,
  challengeId,
  isCompleted,
  completedAt,
  completedValue,
}: OnetimeTaskInputProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value, setValue] = useState<any>(completedValue ?? getDefaultValue(task.type));

  // For completed tasks, just show the summary
  if (isCompleted) {
    return (
      <Card className="p-4 bg-muted/30 border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <a
              href={`/challenges/${challengeId}`}
              className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1 group"
            >
              {task.name}
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            {task.points && (
              <span className="text-xs text-muted-foreground">+{task.points} pts</span>
            )}
          </div>
          <DeadlineBadge completedAt={completedAt} />
        </div>
        {completedValue && task.type !== 'boolean' && (
          <p className="text-sm text-muted-foreground mt-2 ml-7">
            {formatCompletedValue(task, completedValue)}
          </p>
        )}
      </Card>
    );
  }

  const handleComplete = async () => {
    // Validate value for required fields
    if (task.required && !hasValue(task.type, value)) {
      toast.error(`Please complete ${task.name}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveOnetimeTaskCompletion({
        participantId,
        taskId: task.id,
        value: task.type === 'boolean' ? true : value,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete task');
      }

      toast.success(`${task.name} completed! +${result.points || task.points || 0} pts`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // For boolean tasks, show inline checkbox + button
  if (task.type === 'boolean') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              id={task.id}
              checked={value === true}
              onCheckedChange={(checked) => setValue(checked)}
              disabled={isSubmitting}
            />
            <Label htmlFor={task.id} className="font-medium cursor-pointer">
              {task.name}
            </Label>
            {task.points && (
              <span className="text-xs text-muted-foreground">+{task.points} pts</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DeadlineBadge deadline={task.deadline} />
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isSubmitting || !value}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Complete'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // For other types, show expandable card
  return (
    <Card className="p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{task.name}</span>
          {task.points && (
            <span className="text-xs text-muted-foreground">+{task.points} pts</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DeadlineBadge deadline={task.deadline} />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {renderInput(task, value, setValue, isSubmitting)}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isSubmitting || (task.required && !hasValue(task.type, value))}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Mark Complete'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function getDefaultValue(type: string): any {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'duration':
      return undefined;
    case 'choice':
      return '';
    case 'text':
      return '';
    case 'file':
      return [];
    default:
      return undefined;
  }
}

function hasValue(type: string, value: any): boolean {
  if (value === undefined || value === null) return false;
  switch (type) {
    case 'boolean':
      return value === true;
    case 'number':
    case 'duration':
      return typeof value === 'number' && !isNaN(value);
    case 'choice':
    case 'text':
      return typeof value === 'string' && value.trim().length > 0;
    case 'file':
      return Array.isArray(value) && value.length > 0;
    default:
      return false;
  }
}

function formatCompletedValue(task: Task, value: any): string {
  switch (task.type) {
    case 'number':
      return `${value}${task.config?.max ? ` / ${task.config.max}` : ''}`;
    case 'duration':
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return `${hours}h ${minutes}m`;
    case 'text':
      return value.length > 50 ? `${value.substring(0, 50)}...` : value;
    case 'choice':
      return Array.isArray(value) ? value.join(', ') : value;
    case 'file':
      return `${value.length} file${value.length > 1 ? 's' : ''} uploaded`;
    default:
      return String(value);
  }
}

function renderInput(
  task: Task,
  value: any,
  setValue: (v: any) => void,
  disabled: boolean
) {
  switch (task.type) {
    case 'number':
      return (
        <div className="space-y-2">
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setValue(val === '' ? undefined : parseFloat(val));
            }}
            min={task.config?.min}
            max={task.config?.max}
            placeholder={task.config?.placeholder || '0'}
            disabled={disabled}
          />
          {task.config?.min !== undefined && task.config?.max !== undefined && (
            <p className="text-xs text-muted-foreground">
              Range: {task.config.min} - {task.config.max}
            </p>
          )}
        </div>
      );

    case 'duration':
      const hours = value ? Math.floor(value / 60) : '';
      const minutes = value ? value % 60 : '';
      return (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => {
                  const val = e.target.value;
                  const h = val === '' ? 0 : parseInt(val);
                  const currentMinutes = (value || 0) % 60;
                  const total = h * 60 + currentMinutes;
                  setValue(total === 0 ? undefined : total);
                }}
                placeholder="0"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground ml-1">hours</span>
            </div>
            <div className="flex-1">
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => {
                  const val = e.target.value;
                  const m = val === '' ? 0 : parseInt(val);
                  const currentHours = Math.floor((value || 0) / 60);
                  const total = currentHours * 60 + m;
                  setValue(total === 0 ? undefined : total);
                }}
                placeholder="0"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground ml-1">minutes</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Total: {Math.floor((value || 0) / 60)}h {(value || 0) % 60}m
          </p>
        </div>
      );

    case 'choice':
      if (task.config?.allowMultiple) {
        return (
          <div className="space-y-2">
            {task.config.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${task.id}-${option}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValue = Array.isArray(value) ? value : [];
                    if (checked) {
                      setValue([...currentValue, option]);
                    } else {
                      setValue(currentValue.filter((v: string) => v !== option));
                    }
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={`${task.id}-${option}`} className="text-sm font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }
      return (
        <RadioGroup
          value={value || ''}
          onValueChange={setValue}
          disabled={disabled}
        >
          {task.config?.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${task.id}-${option}`} />
              <Label htmlFor={`${task.id}-${option}`} className="font-normal cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case 'text':
      return (
        <div className="space-y-2">
          <Textarea
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={task.config?.placeholder}
            maxLength={task.config?.maxLength}
            disabled={disabled}
            rows={3}
          />
          {task.config?.maxLength && (
            <p className="text-xs text-muted-foreground text-right">
              {(value || '').length}/{task.config.maxLength}
            </p>
          )}
        </div>
      );

    case 'file':
      return (
        <FileUpload
          onUpload={(urls) => setValue(urls)}
          maxFiles={3}
          existingUrls={Array.isArray(value) ? value : []}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
