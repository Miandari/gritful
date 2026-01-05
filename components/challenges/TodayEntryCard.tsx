'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
  Target
} from 'lucide-react';
import { saveDailyEntry } from '@/app/actions/entries';
import { parseLocalDate } from '@/lib/utils/dates';
import { getCurrentWeek, getCurrentMonth, formatPeriodKey } from '@/lib/utils/periods';
import { OnetimeTaskInput } from '@/components/daily-entry/OnetimeTaskInput';
import { PeriodicTaskInput } from '@/components/daily-entry/PeriodicTaskInput';
import { AchievementQueue } from '@/components/achievements/AchievementPopup';
import type { EarnedAchievement } from '@/lib/achievements/types';
import toast from 'react-hot-toast';

interface Metric {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'duration' | 'choice' | 'text' | 'file';
  required: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'onetime';
  deadline?: string;
  points?: number;
  starts_at?: string;
  ends_at?: string;
  config?: {
    min?: number;
    max?: number;
    options?: string[];
    allowMultiple?: boolean;
    maxLength?: number;
    placeholder?: string;
  };
}

interface TodayEntryCardProps {
  challengeId: string;
  participationId: string;
  metrics: Metric[];
  recentEntries: any[];
  periodicCompletions: any[];
  onetimeCompletions: any[];
  currentStreak: number;
  lockEntriesAfterDay?: boolean;
  enableStreakBonus?: boolean;
  streakBonusPoints?: number;
  enablePerfectDayBonus?: boolean;
  perfectDayBonusPoints?: number;
}

export function TodayEntryCard({
  challengeId,
  participationId,
  metrics,
  recentEntries,
  periodicCompletions,
  onetimeCompletions,
  currentStreak,
  lockEntriesAfterDay = false,
}: TodayEntryCardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newAchievements, setNewAchievements] = useState<EarnedAchievement[]>([]);

  // Compute today's date on CLIENT for correct timezone
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Find today's entry from recent entries
  const todayEntry = useMemo(
    () => recentEntries.find((e) => e.entry_date === todayDate) || null,
    [recentEntries, todayDate]
  );

  const isCompleted = todayEntry?.is_completed;
  const isLocked = todayEntry?.is_locked;

  // Initialize form data from existing entry
  useEffect(() => {
    if (todayEntry?.metric_data) {
      setFormData(todayEntry.metric_data);
    }
  }, [todayEntry]);

  // Filter and group tasks
  const { dailyTasks, weeklyTasks, monthlyTasks, onetimeTasks } = useMemo(() => {
    const daily: Metric[] = [];
    const weekly: Metric[] = [];
    const monthly: Metric[] = [];
    const onetime: Metric[] = [];

    const today = parseLocalDate(todayDate);

    const getDateString = (dateStr: string): string => {
      return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };

    const isTaskActiveOnDate = (metric: Metric): boolean => {
      if (!metric.starts_at && !metric.ends_at) return true;

      if (metric.starts_at) {
        const startDate = parseLocalDate(getDateString(metric.starts_at));
        if (today < startDate) return false;
      }

      if (metric.ends_at) {
        const endDate = parseLocalDate(getDateString(metric.ends_at));
        endDate.setHours(23, 59, 59, 999);
        if (today > endDate) return false;
      }

      return true;
    };

    metrics.forEach((metric) => {
      switch (metric.frequency) {
        case 'onetime':
          onetime.push(metric);
          break;
        case 'weekly':
          if (isTaskActiveOnDate(metric)) weekly.push(metric);
          break;
        case 'monthly':
          if (isTaskActiveOnDate(metric)) monthly.push(metric);
          break;
        default:
          if (isTaskActiveOnDate(metric)) daily.push(metric);
          break;
      }
    });

    return { dailyTasks: daily, weeklyTasks: weekly, monthlyTasks: monthly, onetimeTasks: onetime };
  }, [metrics, todayDate]);

  // Filter pending periodic tasks
  const currentWeek = useMemo(() => getCurrentWeek(), []);
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const weeklyPeriodKey = formatPeriodKey(currentWeek);
  const monthlyPeriodKey = formatPeriodKey(currentMonth);

  const pendingWeeklyTasks = useMemo(() => {
    const completedIds = new Set(
      periodicCompletions
        .filter(c => c.frequency === 'weekly' && c.period_start === weeklyPeriodKey)
        .map(c => c.task_id)
    );
    return weeklyTasks.filter(t => !completedIds.has(t.id));
  }, [weeklyTasks, periodicCompletions, weeklyPeriodKey]);

  const pendingMonthlyTasks = useMemo(() => {
    const completedIds = new Set(
      periodicCompletions
        .filter(c => c.frequency === 'monthly' && c.period_start === monthlyPeriodKey)
        .map(c => c.task_id)
    );
    return monthlyTasks.filter(t => !completedIds.has(t.id));
  }, [monthlyTasks, periodicCompletions, monthlyPeriodKey]);

  // Filter pending one-time tasks (not completed and not past deadline)
  const pendingOnetimeTasks = useMemo(() => {
    const completedIds = new Set(onetimeCompletions.map(c => c.task_id));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return onetimeTasks.filter(task => {
      if (completedIds.has(task.id)) return false;

      // Check deadline
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        deadline.setHours(23, 59, 59, 999);
        if (today > deadline) return false;
      }

      return true;
    });
  }, [onetimeTasks, onetimeCompletions]);

  // Check if there are any actionable tasks
  const hasActionableTasks = dailyTasks.length > 0 ||
    pendingWeeklyTasks.length > 0 ||
    pendingMonthlyTasks.length > 0 ||
    pendingOnetimeTasks.length > 0;

  // Update form value
  const updateMetricValue = (metricId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [metricId]: value,
    }));
  };

  // Handle daily tasks submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      for (const metric of dailyTasks) {
        if (metric.required && (formData[metric.id] === undefined || formData[metric.id] === null || formData[metric.id] === '')) {
          setError(`Please complete: ${metric.name}`);
          setIsSubmitting(false);
          return;
        }
      }

      const result = await saveDailyEntry({
        participantId: participationId,
        metricData: formData,
        isCompleted: true,
        targetDate: todayDate,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save entry');
      }

      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
      }

      toast.success('Entry saved!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
      toast.error('Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render compact metric input
  const renderCompactInput = (metric: Metric) => {
    const value = formData[metric.id];

    switch (metric.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
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
            {metric.points && (
              <Badge variant="outline" className="text-xs">
                {metric.points} pts
              </Badge>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center justify-between py-2 gap-4">
            <Label htmlFor={metric.id} className="text-sm shrink-0">
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-2">
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
                className="w-24 text-right"
              />
              {metric.points && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {metric.points} pts
                </Badge>
              )}
            </div>
          </div>
        );

      case 'duration':
        const hours = value ? Math.floor(value / 60) : '';
        const minutes = value ? value % 60 : '';
        return (
          <div className="flex items-center justify-between py-2 gap-4">
            <Label className="text-sm shrink-0">
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
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
                    updateMetricValue(metric.id, total === 0 ? undefined : total);
                  }}
                  placeholder="0"
                  disabled={isLocked}
                  className="w-14 text-right"
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
              <div className="flex items-center gap-1">
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
                    updateMetricValue(metric.id, total === 0 ? undefined : total);
                  }}
                  placeholder="0"
                  disabled={isLocked}
                  className="w-14 text-right"
                />
                <span className="text-xs text-muted-foreground">m</span>
              </div>
              {metric.points && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {metric.points} pts
                </Badge>
              )}
            </div>
          </div>
        );

      case 'choice':
        if (metric.config?.allowMultiple) {
          return (
            <div className="py-2">
              <Label className="text-sm mb-2 block">
                {metric.name}
                {metric.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="flex flex-wrap gap-2">
                {metric.config.options?.map((option) => (
                  <div key={option} className="flex items-center gap-1">
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
                    <Label htmlFor={`${metric.id}-${option}`} className="text-sm font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div className="py-2">
            <Label className="text-sm mb-2 block">
              {metric.name}
              {metric.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={value || ''}
              onValueChange={(val) => updateMetricValue(metric.id, val)}
              disabled={isLocked}
              className="flex flex-wrap gap-4"
            >
              {metric.config?.options?.map((option) => (
                <div key={option} className="flex items-center gap-1">
                  <RadioGroupItem value={option} id={`${metric.id}-${option}`} />
                  <Label htmlFor={`${metric.id}-${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      // Skip text and file types in compact view - direct to Entries tab
      case 'text':
      case 'file':
        return (
          <div className="py-2 text-sm text-muted-foreground flex items-center justify-between">
            <span>{metric.name}</span>
            <Link
              href={`/challenges/${challengeId}/entries`}
              className="text-xs text-green-600 hover:underline flex items-center gap-1"
            >
              Edit in Entries <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  // If no actionable tasks, show a minimal message
  if (!hasActionableTasks) {
    return (
      <Card className="border-green-500/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All tasks complete!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isCompleted ? 'border-green-500 border-2' : ''}>
      {/* Achievement Popup */}
      <AchievementQueue
        achievements={newAchievements}
        onComplete={() => setNewAchievements([])}
      />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Today&apos;s Entry</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            )}
            {isLocked && (
              <Badge variant="secondary">Locked</Badge>
            )}
            <Link
              href={`/challenges/${challengeId}/entries`}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              All entries
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Daily Tasks Section */}
        {dailyTasks.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-1 divide-y">
              {dailyTasks.map((metric) => (
                <div key={metric.id}>
                  {renderCompactInput(metric)}
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="flex-1"
                size="sm"
              >
                {isSubmitting ? 'Saving...' : isCompleted ? 'Update' : 'Save Entry'}
              </Button>
              {lockEntriesAfterDay && !isLocked && isCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Lock
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Weekly Tasks Section */}
        {pendingWeeklyTasks.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">This Week</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {weeklyTasks.length - pendingWeeklyTasks.length}/{weeklyTasks.length} done
              </span>
            </div>
            <div className="space-y-2">
              {pendingWeeklyTasks.map((task) => (
                <PeriodicTaskInput
                  key={task.id}
                  task={task}
                  participantId={participationId}
                  challengeId={challengeId}
                  frequency="weekly"
                  currentPeriod={currentWeek}
                  isCompletedThisPeriod={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Monthly Tasks Section */}
        {pendingMonthlyTasks.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">This Month</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {monthlyTasks.length - pendingMonthlyTasks.length}/{monthlyTasks.length} done
              </span>
            </div>
            <div className="space-y-2">
              {pendingMonthlyTasks.map((task) => (
                <PeriodicTaskInput
                  key={task.id}
                  task={task}
                  participantId={participationId}
                  challengeId={challengeId}
                  frequency="monthly"
                  currentPeriod={currentMonth}
                  isCompletedThisPeriod={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* One-time Tasks Section */}
        {pendingOnetimeTasks.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">One-time</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {onetimeTasks.length - pendingOnetimeTasks.length}/{onetimeTasks.length} done
              </span>
            </div>
            <div className="space-y-2">
              {pendingOnetimeTasks.map((task) => (
                <OnetimeTaskInput
                  key={task.id}
                  task={task}
                  participantId={participationId}
                  challengeId={challengeId}
                  isCompleted={false}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
