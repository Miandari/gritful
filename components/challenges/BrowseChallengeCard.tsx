'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Infinity, Clock } from 'lucide-react';
import JoinPrivateChallengeButtons from '@/components/challenges/JoinPrivateChallengeButtons';
import { CreatorRibbon } from '@/components/challenges/CreatorBadge';
import { getChallengeState } from '@/lib/utils/challengeState';
import { cn } from '@/lib/utils';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface BrowseChallengeCardProps {
  challenge: {
    id: string;
    name: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    duration_days: number | null;
    creator_id: string;
    is_public: boolean;
    metrics: any[];
    creator?: {
      username: string;
    };
    participantCount: number;
    isParticipating: boolean;
    hasRequestedToJoin: boolean;
    requestStatus: string | null;
  };
  currentUserId: string | null;
}

export function BrowseChallengeCard({ challenge, currentUserId }: BrowseChallengeCardProps) {
  // Calculate dates on CLIENT for correct user timezone
  const challengeState = getChallengeState(challenge);

  const getChallengeStatus = () => {
    switch (challengeState.state) {
      case 'upcoming':
        return { label: 'Upcoming', variant: 'secondary' as const, isGrace: false };
      case 'ongoing':
        return { label: 'Ongoing', variant: 'default' as const, isGrace: false };
      case 'active':
        return { label: 'Active', variant: 'default' as const, isGrace: false };
      case 'grace_period':
        return {
          label: `${challengeState.daysRemainingInGrace}d grace`,
          variant: 'outline' as const,
          isGrace: true,
          daysRemaining: challengeState.daysRemainingInGrace
        };
      case 'archived':
        return { label: 'Completed', variant: 'outline' as const, isGrace: false };
      default:
        return { label: 'Active', variant: 'default' as const, isGrace: false };
    }
  };

  const status = getChallengeStatus();
  const isOngoing = challenge.ends_at === null;

  // Calculate days elapsed on CLIENT for correct timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseLocalDate(getLocalDateFromISO(challenge.starts_at));
  const daysElapsed = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const progress = isOngoing
    ? null
    : Math.min(100, Math.max(0, (daysElapsed / (challenge.duration_days || 1)) * 100));

  const isCreator = challenge.creator_id === currentUserId;

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card
        className={cn(
          "relative overflow-hidden h-full transition-shadow hover:shadow-lg",
          status.isGrace && "border-2 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
        )}
      >
        {isCreator && <CreatorRibbon />}
        <CardHeader className={isCreator ? 'pt-8' : ''}>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 flex-1 min-w-0">{challenge.name}</CardTitle>
            <Badge
              variant={status.variant}
              className={cn(
                "shrink-0",
                status.isGrace && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-600 flex items-center gap-1"
              )}
            >
              {status.isGrace && <Clock className="h-3 w-3" />}
              {status.label}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {challenge.description || 'No description'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground shrink-0">Created by</span>
              <span className="font-medium truncate">
                {challenge.creator?.username || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground shrink-0">Duration</span>
              <span className="font-medium">
                {isOngoing ? (
                  <span className="flex items-center gap-1">
                    <Infinity className="h-3 w-3" />
                    Ongoing
                  </span>
                ) : (
                  `${challenge.duration_days} days`
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground shrink-0">Participants</span>
              <span className="font-medium">{challenge.participantCount}</span>
            </div>

            {status.label === 'Active' && !isOngoing && (
              <>
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-muted-foreground shrink-0">Progress</span>
                  <span className="font-medium shrink-0">
                    Day {Math.min(daysElapsed + 1, challenge.duration_days || 1)} of{' '}
                    {challenge.duration_days}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}

            {status.label === 'Ongoing' && (
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground shrink-0">Active for</span>
                <span className="font-medium shrink-0">
                  {daysElapsed + 1} day{daysElapsed !== 0 ? 's' : ''}
                </span>
              </div>
            )}

            {status.label === 'Upcoming' && (
              <div className="text-sm">
                <span className="text-muted-foreground">Starts: </span>
                <span className="font-medium">
                  {format(new Date(challenge.starts_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!challenge.is_public && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
              {challenge.metrics?.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {challenge.metrics.length} metrics
                </Badge>
              )}
              {challenge.isParticipating && (
                <Badge variant="default" className="text-xs">
                  Participating
                </Badge>
              )}
              {challenge.hasRequestedToJoin && challenge.requestStatus === 'pending' && (
                <Badge variant="secondary" className="text-xs">
                  Request Pending
                </Badge>
              )}
              {challenge.requestStatus === 'rejected' && (
                <Badge variant="destructive" className="text-xs">
                  Request Rejected
                </Badge>
              )}
            </div>

            {/* Join buttons for private challenges */}
            {!challenge.is_public && !challenge.isParticipating && !challenge.hasRequestedToJoin && currentUserId && (
              <div className="mt-3">
                <JoinPrivateChallengeButtons
                  challengeId={challenge.id}
                  challengeName={challenge.name}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
