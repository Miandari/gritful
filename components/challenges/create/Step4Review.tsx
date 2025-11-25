'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChallengeWizardStore } from '@/lib/stores/challengeStore';
import { format, addDays } from 'date-fns';
import { createChallenge } from '@/app/actions/challenges';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface Step4ReviewProps {
  onPrev: () => void;
}

export function Step4Review({ onPrev }: Step4ReviewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { formData, metrics, reset } = useChallengeWizardStore();

  const calculateEndDate = () => {
    if (formData.starts_at && formData.duration_days) {
      const start = new Date(formData.starts_at);
      const end = addDays(start, formData.duration_days - 1);
      return format(end, 'MMMM d, yyyy');
    }
    return '';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      boolean: 'Yes/No',
      number: 'Number',
      duration: 'Duration',
      choice: 'Multiple Choice',
      text: 'Text',
      file: 'File Upload',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getFailureModeLabel = (mode: string) => {
    const labels = {
      strict: 'Strict - Reset on miss',
      flexible: 'Flexible - Continue with gaps',
      grace: 'Grace Period - Next day to complete',
    };
    return labels[mode as keyof typeof labels] || mode;
  };

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const challengeData = {
        ...formData,
        metrics: metrics.map((m) => ({
          ...m,
          config: m.config || {},
        })),
      };

      const result = await createChallenge(challengeData as any);

      if ('error' in result) {
        throw new Error(result.error);
      }

      toast.success('Challenge created successfully!');
      reset(); // Clear the wizard state
      router.push(`/challenges/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review Your Challenge</h2>
        <p className="mt-1 text-sm text-gray-600">
          Make sure everything looks good before creating
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-600">Name:</span>
            <p className="font-semibold">{formData.name}</p>
          </div>
          {formData.description && (
            <div>
              <span className="text-sm font-medium text-gray-600">Description:</span>
              <p>{formData.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Duration:</span>
              <p>{formData.duration_days} days</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Start Date:</span>
              <p>{formData.starts_at && format(new Date(formData.starts_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">End Date:</span>
            <p>{calculateEndDate()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({metrics.length})</CardTitle>
          <CardDescription>Items to track</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.map((metric, index) => (
              <div key={metric.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{index + 1}.</span>
                  <span className="font-medium">{metric.name}</span>
                  <Badge variant="secondary">{getTypeLabel(metric.type)}</Badge>
                  {metric.required && <Badge variant="outline">Required</Badge>}
                </div>
                {metric.config?.units && (
                  <span className="text-sm text-gray-500">{metric.config.units}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Privacy:</span>
            <Badge variant={formData.is_public ? 'default' : 'secondary'}>
              {formData.is_public ? 'Public' : 'Private (Invite Only)'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Failure Mode:</span>
            <span className="text-sm">{getFailureModeLabel(formData.failure_mode || 'flexible')}</span>
          </div>
          {formData.lock_entries_after_day && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Entry Locking:</span>
              <Badge variant="outline">Enabled</Badge>
            </div>
          )}
          {formData.is_template && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Template:</span>
              <Badge variant="outline">Save as Template</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {!formData.is_public && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900">
            <strong>Note:</strong> An invite code will be generated after creating this private
            challenge. Share it with people you want to join.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isCreating}>
          Previous
        </Button>
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Challenge...
            </>
          ) : (
            'Create Challenge'
          )}
        </Button>
      </div>
    </div>
  );
}