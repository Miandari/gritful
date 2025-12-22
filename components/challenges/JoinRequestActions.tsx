'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, CheckCircle } from 'lucide-react';
import { approveJoinRequest, rejectJoinRequest } from '@/app/actions/joinRequests';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface JoinRequestActionsProps {
  requestId: string;
}

export default function JoinRequestActions({ requestId }: JoinRequestActionsProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    setError('');

    const result = await approveJoinRequest(requestId);

    if (result.success) {
      setActionCompleted('approved');
      toast.success('Request approved! User has been added to the challenge.');
      router.refresh();
    } else {
      setError(result.error || 'Failed to approve request');
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    setError('');

    const result = await rejectJoinRequest(requestId);

    if (result.success) {
      setActionCompleted('rejected');
      toast.success('Request rejected.');
      router.refresh();
    } else {
      setError(result.error || 'Failed to reject request');
      setIsRejecting(false);
    }
  };

  // Show success state after action completes
  if (actionCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className={`h-4 w-4 ${actionCompleted === 'approved' ? 'text-green-500' : 'text-muted-foreground'}`} />
        <span className={actionCompleted === 'approved' ? 'text-green-600' : 'text-muted-foreground'}>
          {actionCompleted === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
        >
          {isApproving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={isApproving || isRejecting}
        >
          {isRejecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
