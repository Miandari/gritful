'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useChallengeWizardStore } from '@/lib/stores/challengeStore';
import { addDays, format } from 'date-fns';
import { ArrowLeft, Infinity } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const step1Schema = z.object({
  name: z.string().min(3, 'Challenge name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  duration_days: z.number().min(1).max(365).nullable(),
  is_ongoing: z.boolean().default(false),
  starts_at: z.string().min(1, 'Start date is required'),
}).refine((data) => {
  // Either ongoing or has a valid duration
  return data.is_ongoing || (data.duration_days !== null && data.duration_days > 0);
}, {
  message: 'Duration is required for non-ongoing challenges',
  path: ['duration_days'],
});

type Step1FormData = z.infer<typeof step1Schema>;

interface Step1BasicInfoProps {
  onNext: () => void;
  onBackToTemplates?: () => void;
}

export function Step1BasicInfo({ onNext, onBackToTemplates }: Step1BasicInfoProps) {
  const { formData, updateFormData } = useChallengeWizardStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name || '',
      description: formData.description || '',
      duration_days: formData.duration_days ?? 30,
      is_ongoing: formData.is_ongoing ?? false,
      starts_at: formData.starts_at || format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const watchDuration = watch('duration_days');
  const watchStartDate = watch('starts_at');
  const watchIsOngoing = watch('is_ongoing');

  const calculateEndDate = () => {
    if (watchIsOngoing) {
      return 'Ongoing - no end date';
    }
    if (watchStartDate && watchDuration) {
      const start = new Date(watchStartDate);
      const end = addDays(start, watchDuration - 1);
      return format(end, 'MMMM d, yyyy');
    }
    return '';
  };

  const handleOngoingChange = (checked: boolean) => {
    setValue('is_ongoing', checked);
    if (checked) {
      setValue('duration_days', null);
    } else {
      setValue('duration_days', 30);
    }
  };

  const onSubmit = (data: Step1FormData) => {
    updateFormData(data);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Challenge Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., 30-Day Fitness Challenge"
          className="mt-1"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe what this challenge is about..."
          rows={3}
          className="mt-1"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Ongoing toggle */}
      <div className="flex items-start space-x-3 rounded-lg border p-4">
        <Checkbox
          id="is_ongoing"
          checked={watchIsOngoing}
          onCheckedChange={handleOngoingChange}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label htmlFor="is_ongoing" className="font-medium cursor-pointer flex items-center gap-2">
            <Infinity className="h-4 w-4" />
            Ongoing challenge (no end date)
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            The challenge continues until you manually end it. Great for habits you want to maintain indefinitely.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Duration input - hidden when ongoing */}
        {!watchIsOngoing && (
          <div>
            <Label htmlFor="duration_days">Duration (days) *</Label>
            <Input
              id="duration_days"
              type="number"
              {...register('duration_days', { valueAsNumber: true })}
              min={1}
              max={365}
              className="mt-1"
            />
            {errors.duration_days && (
              <p className="mt-1 text-sm text-red-600">{errors.duration_days.message}</p>
            )}
          </div>
        )}

        <div className={watchIsOngoing ? 'sm:col-span-2' : ''}>
          <Label htmlFor="starts_at">Start Date *</Label>
          <Input
            id="starts_at"
            type="date"
            {...register('starts_at')}
            className="mt-1"
          />
          {errors.starts_at && (
            <p className="mt-1 text-sm text-red-600">{errors.starts_at.message}</p>
          )}
          {watchStartDate && new Date(watchStartDate) < new Date(format(new Date(), 'yyyy-MM-dd')) && (
            <p className="mt-1 text-sm text-muted-foreground">
              Starting in the past? You can backfill entries for previous days.
            </p>
          )}
        </div>
      </div>

      {watchStartDate && (watchDuration || watchIsOngoing) && (
        <div className={`rounded-lg p-4 ${watchIsOngoing ? 'bg-purple-50' : 'bg-blue-50'}`}>
          {watchIsOngoing ? (
            <>
              <p className="text-sm text-purple-900 flex items-center gap-2">
                <Infinity className="h-4 w-4" />
                <span className="font-semibold">Ongoing Challenge</span>
              </p>
              <p className="text-sm text-purple-900 mt-1">
                This challenge will continue until you manually end it for all participants.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Challenge Duration:</span> {watchDuration} days
              </p>
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Ends on:</span> {calculateEndDate()}
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex justify-between">
        {onBackToTemplates && (
          <Button type="button" variant="outline" onClick={onBackToTemplates}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        )}
        <Button type="submit" className={!onBackToTemplates ? 'ml-auto' : ''}>
          Next: Add Tasks
        </Button>
      </div>
    </form>
  );
}