'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, Calendar, ArrowRight, Target, Plus, Lock, CheckCircle, Clock } from 'lucide-react';
import { joinChallenge } from '@/app/actions/challenges';
import { submitJoinRequest } from '@/app/actions/joinRequests';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorBadge } from '@/components/challenges/CreatorBadge';

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  starts_at: string;
  ends_at: string;
  is_public: boolean;
  creator_id?: string;
  challenge_participants?: { count: number }[];
}

interface JoinRequest {
  challenge_id: string;
  status: string;
}

interface DiscoverChallengesWidgetProps {
  challenges: Challenge[];
  isNewUser: boolean;
  joinRequests?: JoinRequest[];
  showMore?: boolean;
  currentUserId?: string;
}

export function DiscoverChallengesWidget({ challenges, isNewUser, joinRequests = [], showMore = false, currentUserId }: DiscoverChallengesWidgetProps) {
  const router = useRouter();
  const [loadingChallenges, setLoadingChallenges] = useState<Set<string>>(new Set());

  const getParticipantCount = (challenge: Challenge) => {
    return challenge.challenge_participants?.[0]?.count || 0;
  };

  const getJoinRequestStatus = (challengeId: string) => {
    return joinRequests.find(req => req.challenge_id === challengeId);
  };

  const handleJoin = async (challengeId: string, isPublic: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoadingChallenges(prev => new Set(prev).add(challengeId));

    try {
      if (isPublic) {
        const result = await joinChallenge(challengeId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error || 'Failed to join challenge');
        }
      } else {
        const result = await submitJoinRequest(challengeId);
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error || 'Failed to request to join');
        }
      }
    } finally {
      setLoadingChallenges(prev => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
    }
  };

  // Determine how many challenges to show
  const challengesToShow = showMore ? (isNewUser ? 6 : 5) : 3;

  return (
    <Card className="border-2 border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5 text-blue-600" />
          {isNewUser ? 'Get Started' : 'Discover More'}
        </CardTitle>
        <CardDescription className="text-base">
          {isNewUser
            ? 'Join a challenge to build accountability, track your progress, and turn your goals into daily habits.'
            : 'Explore more challenges to expand your growth journey'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.length > 0 ? (
          <>
            <div className={showMore ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
              {challenges.slice(0, challengesToShow).map((challenge) => {
                const participantCount = getParticipantCount(challenge);
                const daysRemaining = Math.max(
                  0,
                  Math.ceil(
                    (new Date(challenge.ends_at).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                const joinRequest = getJoinRequestStatus(challenge.id);
                const isLoading = loadingChallenges.has(challenge.id);

                return (
                  <div key={challenge.id} className="group rounded-lg border bg-card p-4 transition-all hover:border-blue-400 hover:shadow-md">
                    <Link
                      href={`/challenges/${challenge.id}`}
                      className="block"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground line-clamp-1 group-hover:text-blue-600">
                                {challenge.name}
                              </h4>
                              {!challenge.is_public && (
                                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {challenge.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {participantCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {daysRemaining}d left
                            </span>
                            {currentUserId && challenge.creator_id === currentUserId && (
                              <CreatorBadge className="ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                      {joinRequest ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          {joinRequest.status === 'pending' ? (
                            <>
                              <Clock className="mr-2 h-3 w-3" />
                              Request Pending
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-3 w-3" />
                              Request {joinRequest.status}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={(e) => handleJoin(challenge.id, challenge.is_public, e)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            'Loading...'
                          ) : challenge.is_public ? (
                            'Join Challenge'
                          ) : (
                            'Request to Join'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button asChild className="w-full" variant="outline" size="sm">
              <Link href="/challenges/browse">
                View All Challenges
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              No public challenges available right now
            </p>
            <Button asChild variant="default" size="sm">
              <Link href="/challenges/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your Own
              </Link>
            </Button>
          </div>
        )}

        {isNewUser && (
          <div className="pt-2 border-t">
            <Button asChild className="w-full" size="sm">
              <Link href="/challenges/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your Own Challenge
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
