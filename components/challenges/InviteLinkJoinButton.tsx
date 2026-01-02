'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { joinViaInviteLink } from '@/app/actions/inviteLinks';

interface InviteLinkJoinButtonProps {
  token: string;
  autoAdmit: boolean;
  challengeId: string;
}

export default function InviteLinkJoinButton({
  token,
  autoAdmit,
  challengeId,
}: InviteLinkJoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    type?: 'joined' | 'request_created';
    error?: string;
  } | null>(null);
  const router = useRouter();

  const handleJoin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await joinViaInviteLink(token);

      if (response.success) {
        setResult({
          success: true,
          type: response.result as 'joined' | 'request_created',
        });

        // If auto-admitted, redirect to challenge after a brief delay
        if (response.result === 'joined') {
          setTimeout(() => {
            router.push(`/challenges/${challengeId}`);
          }, 1500);
        }
      } else {
        setResult({
          success: false,
          error: response.error,
        });

        // If already a member, offer redirect
        if (response.alreadyMember) {
          setTimeout(() => {
            router.push(`/challenges/${challengeId}`);
          }, 2000);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show success state
  if (result?.success && result.type === 'joined') {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium">You&apos;re in!</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to the challenge...
          </p>
        </div>
      </div>
    );
  }

  // Show request submitted state
  if (result?.success && result.type === 'request_created') {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium">Request Sent!</p>
          <p className="text-sm text-muted-foreground">
            The challenge creator will review your request. You&apos;ll be notified when approved.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/challenges/browse')}
        >
          Browse Other Challenges
        </Button>
      </div>
    );
  }

  // Show error state
  if (result?.success === false) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-destructive">{result.error}</p>
        <Button onClick={handleJoin} disabled={isLoading} className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  // Default: Show join button
  return (
    <div className="text-center space-y-4">
      <Button
        onClick={handleJoin}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {autoAdmit ? 'Joining...' : 'Sending Request...'}
          </>
        ) : autoAdmit ? (
          'Join Challenge'
        ) : (
          'Request to Join'
        )}
      </Button>
      {!autoAdmit && (
        <p className="text-xs text-muted-foreground">
          The creator will review your request
        </p>
      )}
    </div>
  );
}
