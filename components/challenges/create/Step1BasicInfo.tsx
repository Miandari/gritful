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
import { ArrowLeft } from 'lucide-react';

const step1Schema = z.object({
  name: z.string().min(3, 'Challenge name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  duration_days: z.number().min(1).max(365),
  starts_at: z.string().refine((date) => {
    // Parse the date string (YYYY-MM-DD) into components
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Allow today or future dates
    return startDate.getTime() >= today.getTime();
  }, 'Start date cannot be before today'),
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
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name || '',
      description: formData.description || '',
      duration_days: formData.duration_days || 30,
      starts_at: formData.starts_at || format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const watchDuration = watch('duration_days');
  const watchStartDate = watch('starts_at');

  const calculateEndDate = () => {
    if (watchStartDate && watchDuration) {
      const start = new Date(watchStartDate);
      const end = addDays(start, watchDuration - 1);
      return format(end, 'MMMM d, yyyy');
    }
    return '';
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

      <div className="grid gap-6 sm:grid-cols-2">
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

        <div>
          <Label htmlFor="starts_at">Start Date *</Label>
          <Input
            id="starts_at"
            type="date"
            {...register('starts_at')}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="mt-1"
          />
          {errors.starts_at && (
            <p className="mt-1 text-sm text-red-600">{errors.starts_at.message}</p>
          )}
        </div>
      </div>

      {watchStartDate && watchDuration && (
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Challenge Duration:</span> {watchDuration} days
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Ends on:</span> {calculateEndDate()}
          </p>
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