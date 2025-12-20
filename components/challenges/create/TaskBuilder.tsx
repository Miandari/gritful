'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { defaultMetricTemplates, TaskFrequency } from '@/lib/validations/challenge';
import { MetricFormData } from '@/lib/validations/challenge';
import { DEADLINE_PRESETS, calculateDeadline, DeadlinePreset, formatDeadlineForDisplay } from '@/lib/utils/deadlines';
import { format } from 'date-fns';

type GoalDirection = 'at_least' | 'at_most';

// Helper to expand goal/direction to full config
function expandGoalToConfig(
  type: 'number' | 'duration',
  goal: number,
  direction: GoalDirection,
  units?: string,
  existingScoringMode?: 'binary' | 'scaled' | 'tiered'
) {
  return {
    config: {
      min: 0,
      max: direction === 'at_least' ? Math.max(goal * 4, 1000) : goal,
      ...(type === 'number' && units ? { units } : {}),
    },
    threshold: goal,
    threshold_type: direction === 'at_least' ? 'min' as const : 'max' as const,
    // Preserve existing scoring_mode (from templates) or default to binary
    scoring_mode: existingScoringMode || 'binary' as const,
  };
}

// Helper to derive goal/direction from existing metric data
function deriveGoalFromMetric(metric: Partial<MetricFormData>): { goal: number; direction: GoalDirection } {
  const threshold = metric.threshold || 0;
  const thresholdType = metric.threshold_type || 'min';
  return {
    goal: threshold,
    direction: thresholdType === 'min' ? 'at_least' : 'at_most',
  };
}

interface TaskBuilderProps {
  metric: Partial<MetricFormData>;
  onSave: (metric: Partial<MetricFormData>) => void;
  onSaveAndAddAnother?: (metric: Partial<MetricFormData>) => void;
  onCancel: () => void;
  challengeEndDate?: string; // For clamping deadline/end date
  lockFrequency?: TaskFrequency; // Lock frequency to a specific value
  isMidChallengeTask?: boolean; // If true, show task end date picker for recurring tasks
}

export function TaskBuilder({ metric, onSave, onSaveAndAddAnother, onCancel, challengeEndDate, lockFrequency, isMidChallengeTask }: TaskBuilderProps) {
  const [formData, setFormData] = useState<Partial<MetricFormData>>({
    ...defaultMetricTemplates[metric.type as keyof typeof defaultMetricTemplates] || {},
    ...metric,
    frequency: lockFrequency || metric.frequency || 'daily',
  });
  const [options, setOptions] = useState<string[]>(
    (formData.config?.options as string[]) || ['Option 1', 'Option 2']
  );
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('none');
  const [customDeadline, setCustomDeadline] = useState<string>('');
  const [taskEndDate, setTaskEndDate] = useState<string>(
    challengeEndDate ? format(new Date(challengeEndDate), 'yyyy-MM-dd') : ''
  );

  // Simplified goal/direction state for number/duration types
  const derivedGoal = deriveGoalFromMetric(metric);
  const [goal, setGoal] = useState<number>(derivedGoal.goal);
  const [direction, setDirection] = useState<GoalDirection>(derivedGoal.direction);
  const [units, setUnits] = useState<string>(metric.config?.units || '');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleTypeChange = (type: MetricFormData['type']) => {
    const template = defaultMetricTemplates[type as keyof typeof defaultMetricTemplates];
    setFormData({
      ...formData,
      type,
      config: template.config,
    });
    if (type === 'choice') {
      setOptions(['Option 1', 'Option 2']);
    }
    // Reset goal/direction for number/duration types
    if (type === 'number' || type === 'duration') {
      setGoal(0);
      setDirection('at_least');
      setUnits('');
    }
  };

  const handleFrequencyChange = (frequency: TaskFrequency) => {
    setFormData({
      ...formData,
      frequency,
      // Clear deadline if switching away from one-time
      deadline: frequency === 'onetime' ? formData.deadline : undefined,
    });
    if (frequency !== 'onetime') {
      setDeadlinePreset('none');
      setCustomDeadline('');
    }
  };

  const handleDeadlinePresetChange = (preset: DeadlinePreset) => {
    setDeadlinePreset(preset);

    if (preset === 'none') {
      setFormData({ ...formData, deadline: undefined });
      setCustomDeadline('');
    } else if (preset === 'custom') {
      // Custom will be handled by the date input
    } else {
      const deadline = calculateDeadline(preset);
      if (deadline) {
        // Clamp to challenge end date if provided
        let finalDeadline = deadline;
        if (challengeEndDate) {
          const endDate = new Date(challengeEndDate);
          if (deadline > endDate) {
            finalDeadline = endDate;
          }
        }
        setFormData({ ...formData, deadline: finalDeadline.toISOString() });
      }
    }
  };

  const handleCustomDeadlineChange = (dateString: string) => {
    setCustomDeadline(dateString);
    if (dateString) {
      const deadline = new Date(dateString);
      // Clamp to challenge end date if provided
      if (challengeEndDate) {
        const endDate = new Date(challengeEndDate);
        if (deadline > endDate) {
          setFormData({ ...formData, deadline: endDate.toISOString() });
          return;
        }
      }
      setFormData({ ...formData, deadline: deadline.toISOString() });
    } else {
      setFormData({ ...formData, deadline: undefined });
    }
  };

  const handleSave = () => {
    let dataToSave = { ...formData };

    // For number/duration types, expand goal/direction to full config
    if (formData.type === 'number' || formData.type === 'duration') {
      const expanded = expandGoalToConfig(
        formData.type,
        goal,
        direction,
        formData.type === 'number' ? units : undefined,
        formData.scoring_mode // Preserve existing scoring_mode (e.g., from templates)
      );
      dataToSave = { ...dataToSave, ...expanded };
    }

    if (dataToSave.type === 'choice') {
      dataToSave.config = { ...dataToSave.config, options };
    }
    // Add created_at for one-time tasks if not already set
    if (dataToSave.frequency === 'onetime' && !dataToSave.created_at) {
      dataToSave.created_at = new Date().toISOString();
    }
    // Add ends_at for mid-challenge recurring tasks
    if (isMidChallengeTask && dataToSave.frequency !== 'onetime' && taskEndDate) {
      dataToSave.ends_at = new Date(taskEndDate).toISOString();
    }
    onSave(dataToSave);
  };

  const handleSaveAndAddAnother = () => {
    let dataToSave = { ...formData };

    // For number/duration types, expand goal/direction to full config
    if (formData.type === 'number' || formData.type === 'duration') {
      const expanded = expandGoalToConfig(
        formData.type,
        goal,
        direction,
        formData.type === 'number' ? units : undefined,
        formData.scoring_mode // Preserve existing scoring_mode (e.g., from templates)
      );
      dataToSave = { ...dataToSave, ...expanded };
    }

    if (dataToSave.type === 'choice') {
      dataToSave.config = { ...dataToSave.config, options };
    }
    if (dataToSave.frequency === 'onetime' && !dataToSave.created_at) {
      dataToSave.created_at = new Date().toISOString();
    }
    if (isMidChallengeTask && dataToSave.frequency !== 'onetime' && taskEndDate) {
      dataToSave.ends_at = new Date(taskEndDate).toISOString();
    }
    onSaveAndAddAnother?.(dataToSave);

    // Reset form to defaults for next task
    const defaultType = 'boolean';
    setFormData({
      ...defaultMetricTemplates[defaultType],
      name: '',
      frequency: lockFrequency || 'daily',
    });
    setOptions(['Option 1', 'Option 2']);
    setDeadlinePreset('none');
    setCustomDeadline('');
    setGoal(0);
    setDirection('at_least');
    setUnits('');
    setShowAdvanced(false);
  };

  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  // Calculate min date for custom deadline picker (today)
  const minDate = useMemo(() => {
    return format(new Date(), 'yyyy-MM-dd');
  }, []);

  // Calculate max date (challenge end date or 1 year from now)
  const maxDate = useMemo(() => {
    if (challengeEndDate) {
      return format(new Date(challengeEndDate), 'yyyy-MM-dd');
    }
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return format(oneYearFromNow, 'yyyy-MM-dd');
  }, [challengeEndDate]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="task-name">Task Name *</Label>
        <Input
          id="task-name"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Workout completed"
          className="mt-1"
        />
      </div>

      {/* Frequency Selector */}
      <div>
        <Label htmlFor="task-frequency">Frequency *</Label>
        <Select
          value={formData.frequency || 'daily'}
          onValueChange={(v) => handleFrequencyChange(v as TaskFrequency)}
          disabled={!!lockFrequency}
        >
          <SelectTrigger id="task-frequency" className="mt-1">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily - Track every day</SelectItem>
            <SelectItem value="weekly">Weekly - Once per week</SelectItem>
            <SelectItem value="monthly">Monthly - Once per month</SelectItem>
            <SelectItem value="onetime">One-time - Complete once</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {formData.frequency === 'onetime' && 'This task will only need to be completed once during the challenge'}
          {formData.frequency === 'daily' && 'This task will need to be completed every day'}
          {formData.frequency === 'weekly' && 'This task resets every Monday and is due by Sunday'}
          {formData.frequency === 'monthly' && 'This task resets on the 1st and is due by end of month'}
        </p>
      </div>

      {/* Task End Date (for mid-challenge recurring tasks) */}
      {isMidChallengeTask && formData.frequency !== 'onetime' && (
        <div className="space-y-2">
          <Label htmlFor="task-end-date">Task Runs Until *</Label>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              id="task-end-date"
              type="date"
              value={taskEndDate}
              onChange={(e) => setTaskEndDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This task will be tracked from today until this date (max: challenge end date)
          </p>
        </div>
      )}

      {/* Deadline Selector (only for one-time tasks) */}
      {formData.frequency === 'onetime' && (
        <div className="space-y-2">
          <Label htmlFor="task-deadline">Deadline (optional)</Label>
          <Select
            value={deadlinePreset}
            onValueChange={(v) => handleDeadlinePresetChange(v as DeadlinePreset)}
          >
            <SelectTrigger id="task-deadline" className="mt-1">
              <SelectValue placeholder="No deadline" />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom date picker */}
          {deadlinePreset === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={customDeadline}
                onChange={(e) => handleCustomDeadlineChange(e.target.value)}
                min={minDate}
                max={maxDate}
                className="flex-1"
              />
            </div>
          )}

          {/* Show selected deadline */}
          {formData.deadline && deadlinePreset !== 'custom' && (
            <p className="text-xs text-muted-foreground">
              Deadline: {formatDeadlineForDisplay(formData.deadline)}
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="task-type">Type *</Label>
        <Select value={formData.type} onValueChange={handleTypeChange}>
          <SelectTrigger id="task-type" className="mt-1">
            <SelectValue placeholder="Select task type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boolean">Checkbox - Did you do it?</SelectItem>
            <SelectItem value="number">Number - How many?</SelectItem>
            <SelectItem value="duration">Duration - How long?</SelectItem>
            <SelectItem value="choice">Choice - Pick one option</SelectItem>
            <SelectItem value="text" className="text-muted-foreground">Text Entry</SelectItem>
            <SelectItem value="file" className="text-muted-foreground">File Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific configuration */}
      {formData.type === 'number' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="goal">Goal</Label>
              <Input
                id="goal"
                type="number"
                min="0"
                value={goal || ''}
                onChange={(e) => setGoal(Number(e.target.value) || 0)}
                placeholder="e.g., 20"
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="units">Units (optional)</Label>
              <Input
                id="units"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., reps, pages"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Direction</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="direction"
                  checked={direction === 'at_least'}
                  onChange={() => setDirection('at_least')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">At least</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="direction"
                  checked={direction === 'at_most'}
                  onChange={() => setDirection('at_most')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">At most</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {direction === 'at_least'
                ? `Earn points when you reach at least ${goal || 0}${units ? ` ${units}` : ''}`
                : `Earn points when you stay at or below ${goal || 0}${units ? ` ${units}` : ''}`}
            </p>
          </div>
        </div>
      )}

      {formData.type === 'duration' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-duration">Goal (minutes)</Label>
            <Input
              id="goal-duration"
              type="number"
              min="0"
              value={goal || ''}
              onChange={(e) => setGoal(Number(e.target.value) || 0)}
              placeholder="e.g., 30"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Direction</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="direction-duration"
                  checked={direction === 'at_least'}
                  onChange={() => setDirection('at_least')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">At least</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="direction-duration"
                  checked={direction === 'at_most'}
                  onChange={() => setDirection('at_most')}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">At most</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {direction === 'at_least'
                ? `Earn points when you spend at least ${goal || 0} minutes`
                : `Earn points when you spend at most ${goal || 0} minutes`}
            </p>
          </div>
        </div>
      )}

      {formData.type === 'choice' && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="mr-1 h-4 w-4" />
            Add Option
          </Button>
        </div>
      )}

      {formData.type === 'text' && (
        <div>
          <Label htmlFor="max-length">Maximum Length</Label>
          <Input
            id="max-length"
            type="number"
            value={formData.config?.maxLength || 500}
            onChange={(e) =>
              setFormData({
                ...formData,
                config: { ...formData.config, maxLength: Number(e.target.value) },
              })
            }
            className="mt-1"
          />
        </div>
      )}

      {formData.type === 'file' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="max-size">Maximum File Size (MB)</Label>
            <Input
              id="max-size"
              type="number"
              value={formData.config?.maxSizeMB || 10}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, maxSizeMB: Number(e.target.value) },
                })
              }
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Advanced Settings (Collapsible) */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Advanced Settings</span>
          {!showAdvanced && (
            <span className="text-xs ml-auto">
              {formData.points !== 1 && `${formData.points} pts`}
              {formData.required === false && ' (optional)'}
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-6">
            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={formData.points || 1}
                onChange={(e) =>
                  setFormData({ ...formData, points: Number(e.target.value) })
                }
                placeholder="1"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Points awarded when this task is completed (default: 1)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={formData.required !== false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, required: checked as boolean })
                }
              />
              <Label htmlFor="required">Required field</Label>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {onSaveAndAddAnother && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndAddAnother}
            disabled={!formData.name || !formData.type}
          >
            Save & Add Another
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!formData.name || !formData.type}
        >
          Save Task
        </Button>
      </div>
    </div>
  );
}

// Keep backward compatibility alias
export { TaskBuilder as MetricBuilder };
