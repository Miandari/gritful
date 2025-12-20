'use client';

import { Button } from '@/components/ui/button';
import { joinChallenge } from '@/app/actions/challenges';
import { submitJoinRequest } from '@/app/actions/joinRequests';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Lock, UserPlus, Key } from 'lucide-react';
import EnterCodeModal from './EnterCodeModal';

interface JoinChallengeButtonProps {
  challengeId: string;
  isPublic: boolean;
  hasPendingRequest?: boolean;
  requestStatus?: string;
}

export default function JoinChallengeButton({
  challengeId,
  isPublic,
  hasPendingRequest = false,
  requestStatus
}: JoinChallengeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const handleRequestJoin = async () => {
    setIsLoading(true);

    try {
      if (isPublic) {
        // Direct join for public challenges
        router.push(`/challenges/${challengeId}/join`);
      } else {
        // Request to join for private challenges
        const result = await submitJoinRequest(challengeId);
        if (result.success) {
          alert('Join request sent! The challenge creator will review your request.');
          router.refresh();
        } else {
          alert(result.error || 'Failed to send join request');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If there's a pending request, show status + Enter Code button for private
  if (hasPendingRequest) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" disabled>
          {requestStatus === 'pending' ? 'Request Pending' : `Request ${requestStatus}`}
        </Button>
        {!isPublic && (
          <>
            <Button variant="secondary" onClick={() => setIsCodeModalOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              Enter Code
            </Button>
            <EnterCodeModal
              isOpen={isCodeModalOpen}
              onClose={() => setIsCodeModalOpen(false)}
            />
          </>
        )}
      </div>
    );
  }

  // Public challenge - single button
  if (isPublic) {
    return (
      <Button onClick={handleRequestJoin} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Join Challenge
          </>
        )}
      </Button>
    );
  }

  // Private challenge - dual buttons
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleRequestJoin} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Request to Join
          </>
        )}
      </Button>
      <Button variant="secondary" onClick={() => setIsCodeModalOpen(true)}>
        <Key className="mr-2 h-4 w-4" />
        Enter Code
      </Button>
      <EnterCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
