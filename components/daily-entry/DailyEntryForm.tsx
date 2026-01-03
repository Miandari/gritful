'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { saveDailyEntry, deleteDailyEntry } from '@/app/actions/entries';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/ui/file-upload';
import { OnetimeTasksSection } from './OnetimeTasksSection';
import { PeriodicTasksSection } from './PeriodicTasksSection';
import { AchievementQueue } from '@/components/achievements/AchievementPopup';
import type { EarnedAchievement } from '@/lib/achievements/types';
import { parseLocalDate } from '@/lib/utils/dates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

interface Metric {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'duration' | 'choice' | 'text' | 'file';
  required: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'onetime';
  deadline?: string;
  points?: number;
  starts_at?: string; // ISO timestamp - when task becomes active
  ends_at?: string;   // ISO timestamp - when task ends
  config?: {
    min?: number;
    max?: number;
    options?: string[];
    allowMultiple?: boolean;
    maxLength?: number;
    placeholder?: string;
  };
}

interface OnetimeCompletion {
  task_id: string;
  completed_at: string;
  value: any;
}

interface PeriodicCompletion {
  task_id: string;
  frequency: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  completed_at: string;
  value: any;
}

interface DailyEntryFormProps {
  challenge: {
    id: string;
    name: string;
    metrics: Metric[];
    lock_entries_after_day: boolean;
  };
  participationId: string;
  existingEntry?: any;
  isLocked?: boolean;
  targetDate?: string; // YYYY-MM-DD format, defaults to today
  onetimeCompletions?: OnetimeCompletion[]; // Completions for one-time tasks
  periodicCompletions?: PeriodicCompletion[]; // Completions for weekly/monthly tasks
}

export default function DailyEntryForm({
  challenge,
  participationId,
  existingEntry,
  isLocked = false,
  targetDate,
  onetimeCompletions = [],
  periodicCompletions = [],
}: DailyEntryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>(
    existingEntry?.metric_data || {}
  );
  const [newAchievements, setNewAchievements] = useState<EarnedAchievement[]>([]);

  // Compute effective date on CLIENT side - ensures correct user timezone
  // This is the date that will be used when saving the entry
  const effectiveDate = useMemo(
    () => targetDate || format(new Date(), 'yyyy-MM-dd'),
    [targetDate]
  );

  // Filter metrics into daily, weekly, monthly, and one-time tasks, respecting date ranges
  const { dailyTasks, weeklyTasks, monthlyTasks, onetimeTasks } = useMemo(() => {
    const daily: Metric[] = [];
    const weekly: Metric[] = [];
    const monthly: Metric[] = [];
    const onetime: Metric[] = [];

    // Parse the effective date for comparison using parseLocalDate for correct timezone handling
    const entryDate = parseLocalDate(effectiveDate);

    // Helper to extract date string from ISO timestamp or date string
    const getDateString = (dateStr: string): string => {
      // If it contains 'T', it's a full ISO timestamp - extract just the date part
      return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };

    // Helper to check if a task is active on the entry date
    const isTaskActiveOnDate = (metric: Metric): boolean => {
      // If no date constraints, task is always active (backward compatibility)
      if (!metric.starts_at && !metric.ends_at) {
        return true;
      }

      // Check starts_at - task must have started by entry date
      if (metric.starts_at) {
        const startDate = parseLocalDate(getDateString(metric.starts_at));
        if (entryDate < startDate) {
          return false;
        }
      }

      // Check ends_at - task must not have ended before entry date
      if (metric.ends_at) {
        const endDate = parseLocalDate(getDateString(metric.ends_at));
        // Set to end of day for comparison
        endDate.setHours(23, 59, 59, 999);
        if (entryDate > endDate) {
          return false;
        }
      }

      return true;
    };

    challenge.metrics.forEach((metric) => {
      // Filter by frequency and date range
      switch (metric.frequency) {
        case 'onetime':
          // One-time tasks are always shown (they handle their own completion state)
          onetime.push(metric);
          break;
        case 'weekly':
          // Weekly tasks are shown if active
          if (isTaskActiveOnDate(metric)) {
            weekly.push(metric);
          }
          break;
        case 'monthly':
          // Monthly tasks are shown if active
          if (isTaskActiveOnDate(metric)) {
            monthly.push(metric);
          }
          break;
        default:
          // Default to 'daily' for backward compatibility
          if (isTaskActiveOnDate(metric)) {
            daily.push(metric);
          }
          break;
      }
    });

    return { dailyTasks: daily, weeklyTasks: weekly, monthlyTasks: monthly, onetimeTasks: onetime };
  }, [challenge.metrics, effectiveDate]);

  // Update form data when existingEntry changes (when user selects different date)
  useEffect(() => {
    setFormData(existingEntry?.metric_data || {});
  }, [existingEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields (only for daily tasks)
      for (const metric of dailyTasks) {
        if (metric.required && (formData[metric.id] === undefined || formData[metric.id] === null || formData[metric.id] === '')) {
          setError(`Please complete the required field: ${metric.name}`);
          setIsSubmitting(false);
          return;
        }
      }

      const result = await saveDailyEntry({
        participantId: participationId,
        metricData: formData,
        isCompleted: true,
        notes: formData.notes || '',
        targetDate: effectiveDate,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save entry');
      }

      // Show achievement popup if any new achievements were earned
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMetricValue = (metricId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [metricId]: value,
    }));
  };

  const handleDelete = async () => {
    if (!existingEntry?.id) return;

    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteDailyEntry(existingEntry.id, challenge.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete entry');
      }

      toast.success('Entry deleted successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      toast.error(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMetricInput = (metric: Metric) => {
    const value = formData[metric.id];

    switch (metric.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={metric.id}
              checked={value || false}
              onCheckedChange={(checked) => updateMetricValue(metric.id, checked)}
              disabled={isLocked}
            />
            <Label htmlFor={metric.id} className="text-sm font-normal cursor-pointer">
              {metric.name}
            </Label>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={metric.id}>
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={metric.id}
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                updateMetricValue(metric.id, val === '' ? undefined : parseFloat(val));
              }}
              min={metric.config?.min}
              max={metric.config?.max}
              placeholder={metric.config?.placeholder || '0'}
              disabled={isLocked}
              required={metric.required}
            />
            {metric.config?.min !== undefined && metric.config?.max !== undefined && (
              <p className="text-xs text-muted-foreground">
                Range: {metric.config.min} - {metric.config.max}
              </p>
            )}
          </div>
        );

      case 'duration':
        return (
          <div className="space-y-2">
            <Label htmlFor={metric.id}>
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  id={`${metric.id}-hours`}
                  type="number"
                  min="0"
                  max="23"
                  value={value ? Math.floor(value / 60) || '' : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const hours = val === '' ? 0 : parseInt(val);
                    const currentMinutes = (value || 0) % 60;
                    const totalMinutes = hours * 60 + currentMinutes;
                    updateMetricValue(metric.id, totalMinutes === 0 ? undefined : totalMinutes);
                  }}
                  placeholder="0"
                  disabled={isLocked}
                />
                <span className="text-xs text-muted-foreground ml-1">hours</span>
              </div>
              <div className="flex-1">
                <Input
                  id={`${metric.id}-minutes`}
                  type="number"
                  min="0"
                  max="59"
                  value={value ? (value % 60) || '' : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const minutes = val === '' ? 0 : parseInt(val);
                    const currentHours = Math.floor((value || 0) / 60);
                    const totalMinutes = currentHours * 60 + minutes;
                    updateMetricValue(metric.id, totalMinutes === 0 ? undefined : totalMinutes);
                  }}
                  placeholder="0"
                  disabled={isLocked}
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
        return (
          <div className="space-y-2">
            <Label>
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {metric.config?.allowMultiple ? (
              <div className="space-y-2">
                {metric.config.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${metric.id}-${option}`}
                      checked={Array.isArray(value) && value.includes(option)}
                      onCheckedChange={(checked) => {
                        const currentValue = Array.isArray(value) ? value : [];
                        if (checked) {
                          updateMetricValue(metric.id, [...currentValue, option]);
                        } else {
                          updateMetricValue(metric.id, currentValue.filter((v) => v !== option));
                        }
                      }}
                      disabled={isLocked}
                    />
                    <Label
                      htmlFor={`${metric.id}-${option}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={value || ''}
                onValueChange={(val) => updateMetricValue(metric.id, val)}
                disabled={isLocked}
              >
                {metric.config?.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${metric.id}-${option}`} />
                    <Label htmlFor={`${metric.id}-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={metric.id}>
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={metric.id}
              value={value || ''}
              onChange={(e) => updateMetricValue(metric.id, e.target.value)}
              placeholder={metric.config?.placeholder}
              maxLength={metric.config?.maxLength}
              disabled={isLocked}
              required={metric.required}
              rows={3}
            />
            {metric.config?.maxLength && (
              <p className="text-xs text-muted-foreground text-right">
                {(value || '').length}/{metric.config.maxLength}
              </p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Label htmlFor={metric.id}>
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <FileUpload
              onUpload={(urls) => updateMetricValue(metric.id, urls)}
              maxFiles={3}
              existingUrls={Array.isArray(value) ? value : []}
              disabled={isLocked}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Achievement Popup */}
      <AchievementQueue
        achievements={newAchievements}
        onComplete={() => setNewAchievements([])}
      />

      {/* Daily Tasks Section */}
      {dailyTasks.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Daily Tasks</h3>
            <div className="space-y-4">
              {dailyTasks.map((metric) => (
                <Card key={metric.id} className="p-4">
                  {renderMetricInput(metric)}
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateMetricValue('notes', e.target.value)}
              placeholder="Any additional thoughts or reflections..."
              disabled={isLocked}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
            </Button>
            {challenge.lock_entries_after_day && !isLocked && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  // Save and lock
                  await handleSubmit(new Event('submit') as any);
                  // The lock will be handled by the server action
                }}
                disabled={isSubmitting}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Save & Lock
              </Button>
            )}
            {existingEntry && !isLocked && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting || isSubmitting}
                    className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this entry? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {challenge.lock_entries_after_day && (
            <p className="text-xs text-muted-foreground text-center">
              Note: Entries will be automatically locked after submission if configured
            </p>
          )}
        </form>
      )}

      {/* Divider between daily and periodic sections */}
      {dailyTasks.length > 0 && (weeklyTasks.length > 0 || monthlyTasks.length > 0) && (
        <hr className="border-border" />
      )}

      {/* Weekly Tasks Section */}
      {weeklyTasks.length > 0 && (
        <PeriodicTasksSection
          tasks={weeklyTasks}
          frequency="weekly"
          participantId={participationId}
          challengeId={challenge.id}
          completions={periodicCompletions as any}
        />
      )}

      {/* Monthly Tasks Section */}
      {monthlyTasks.length > 0 && (
        <PeriodicTasksSection
          tasks={monthlyTasks}
          frequency="monthly"
          participantId={participationId}
          challengeId={challenge.id}
          completions={periodicCompletions as any}
        />
      )}

      {/* Divider before one-time section */}
      {(dailyTasks.length > 0 || weeklyTasks.length > 0 || monthlyTasks.length > 0) && onetimeTasks.length > 0 && (
        <hr className="border-border" />
      )}

      {/* One-time Tasks Section */}
      {onetimeTasks.length > 0 && (
        <OnetimeTasksSection
          tasks={onetimeTasks}
          participantId={participationId}
          challengeId={challenge.id}
          completions={onetimeCompletions}
        />
      )}
    </div>
  );
}