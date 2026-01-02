'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { endChallenge } from '@/app/actions/endChallenge';
import { useRouter } from 'next/navigation';
import { getUserTimezone } from '@/lib/utils/dates';
import toast from 'react-hot-toast';
import { StopCircle } from 'lucide-react';

interface EndChallengeButtonProps {
  challengeId: string;
  isOngoing: boolean;
  isCreator: boolean;
}

export function EndChallengeButton({ challengeId, isOngoing, isCreator }: EndChallengeButtonProps) {
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show button if user is creator and challenge is ongoing
  if (!isCreator || !isOngoing) return null;

  const handleEnd = async () => {
    setIsEnding(true);
    setError(null);

    try {
      const result = await endChallenge(challengeId, getUserTimezone());

      if (result.success) {
        toast.success('Challenge ended successfully');
        router.refresh();
      } else {
        setError(result.error || 'Failed to end challenge');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isEnding}>
          <StopCircle className="mr-2 h-4 w-4" />
          {isEnding ? 'Ending...' : 'End Challenge'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End this challenge?</AlertDialogTitle>
          <AlertDialogDescription>
            This will end the challenge for <strong>all participants</strong>. The challenge and all
            progress will be archived and visible in past challenges. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEnd}
            disabled={isEnding}
            className="bg-red-600 hover:bg-red-700"
          >
            {isEnding ? 'Ending...' : 'End Challenge'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
