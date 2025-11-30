'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { defaultMetricTemplates, TaskFrequency } from '@/lib/validations/challenge';
import { MetricFormData } from '@/lib/validations/challenge';
import { DEADLINE_PRESETS, calculateDeadline, DeadlinePreset, formatDeadlineForDisplay } from '@/lib/utils/deadlines';
import { format } from 'date-fns';

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
    if (formData.type === 'choice') {
      formData.config = { ...formData.config, options };
    }
    // Add created_at for one-time tasks if not already set
    if (formData.frequency === 'onetime' && !formData.created_at) {
      formData.created_at = new Date().toISOString();
    }
    // Add ends_at for mid-challenge recurring tasks
    if (isMidChallengeTask && formData.frequency !== 'onetime' && taskEndDate) {
      formData.ends_at = new Date(taskEndDate).toISOString();
    }
    onSave(formData);
  };

  const handleSaveAndAddAnother = () => {
    const dataToSave = { ...formData };
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
            <SelectItem value="boolean">Yes/No Checkbox</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="duration">Duration (Time)</SelectItem>
            <SelectItem value="choice">Multiple Choice</SelectItem>
            <SelectItem value="text">Text Entry</SelectItem>
            <SelectItem value="file">File Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific configuration */}
      {formData.type === 'number' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min">Minimum Value</Label>
              <Input
                id="min"
                type="number"
                value={formData.config?.min || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, min: Number(e.target.value) },
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="max">Maximum Value</Label>
              <Input
                id="max"
                type="number"
                value={formData.config?.max || 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, max: Number(e.target.value) },
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="units">Units (optional)</Label>
            <Input
              id="units"
              value={formData.config?.units || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, units: e.target.value },
                })
              }
              placeholder="e.g., reps, miles, kg"
              className="mt-1"
            />
          </div>
        </div>
      )}

      {formData.type === 'duration' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration-min">Minimum (minutes)</Label>
            <Input
              id="duration-min"
              type="number"
              value={formData.config?.min || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, min: Number(e.target.value) },
                })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="duration-max">Maximum (minutes)</Label>
            <Input
              id="duration-max"
              type="number"
              value={formData.config?.max || 1440}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, max: Number(e.target.value) },
                })
              }
              className="mt-1"
            />
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

      {/* Scoring Configuration */}
      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium text-sm">Scoring Configuration</h4>

        <div>
          <Label htmlFor="points">Points *</Label>
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
            Points awarded when this task is completed
          </p>
        </div>

        {(formData.type === 'number' || formData.type === 'duration') && (
          <div>
            <Label htmlFor="threshold">Minimum for Full Points</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              value={formData.threshold || 0}
              onChange={(e) =>
                setFormData({ ...formData, threshold: Number(e.target.value), scoring_mode: 'binary' })
              }
              placeholder="0"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              User must reach this value to earn full points
            </p>
          </div>
        )}
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
