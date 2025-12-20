import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Lock, Infinity, Clock } from 'lucide-react';
import JoinPrivateChallengeButtons from '@/components/challenges/JoinPrivateChallengeButtons';
import { CreatorRibbon } from '@/components/challenges/CreatorBadge';
import { getChallengeState } from '@/lib/utils/challengeState';
import { cn } from '@/lib/utils';

export default async function BrowseChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all challenges (public and private)
  let query = supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  // Add search filter if provided
  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  const { data: challenges } = await query;

  // Fetch creator profiles separately
  const creatorIds = challenges?.map(c => c.creator_id) || [];
  const { data: creators } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', creatorIds);

  const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

  // Get participant counts and join request status for each challenge
  const challengesWithCounts = await Promise.all(
    (challenges || []).map(async (challenge) => {
      // Count participants
      const { count } = await supabase
        .from('challenge_participants')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id)
        .eq('status', 'active');

      // Check if current user is participating
      let isParticipating = false;
      let hasRequestedToJoin = false;
      let requestStatus = null;

      if (user) {
        const { data: participation } = await supabase
          .from('challenge_participants')
          .select('id')
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.id)
          .single();

        isParticipating = !!participation;

        // Check for existing join request if not participating
        if (!isParticipating && !challenge.is_public) {
          const { data: joinRequest } = await supabase
            .from('challenge_join_requests')
            .select('status')
            .eq('challenge_id', challenge.id)
            .eq('user_id', user.id)
            .single();

          if (joinRequest) {
            hasRequestedToJoin = true;
            requestStatus = joinRequest.status;
          }
        }
      }

      return {
        ...challenge,
        creator: creatorMap.get(challenge.creator_id),
        participantCount: count || 0,
        isParticipating,
        hasRequestedToJoin,
        requestStatus,
      };
    })
  );

  const getChallengeStatus = (challenge: any) => {
    const challengeState = getChallengeState(challenge);

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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Browse Challenges</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Discover public and private challenges
        </p>

        {/* Search bar */}
        <form className="mt-6 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search challenges..."
              defaultValue={params?.search}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="sm:px-4 px-3">
            <span className="hidden sm:inline">Search</span>
            <Search className="h-4 w-4 sm:hidden" />
          </Button>
        </form>
      </div>

      {challenges && challenges.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No public challenges found</p>
            <Button asChild className="mt-4">
              <Link href="/challenges/create">Create the First Challenge</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {challengesWithCounts.map((challenge: any) => {
          const status = getChallengeStatus(challenge);
          const isOngoing = challenge.ends_at === null;
          const daysElapsed = Math.floor(
            (new Date().getTime() - new Date(challenge.starts_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const progress = isOngoing
            ? null
            : Math.min(100, Math.max(0, (daysElapsed / challenge.duration_days) * 100));

          const isCreator = challenge.creator_id === user?.id;

          return (
            <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
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
                            Day {Math.min(daysElapsed + 1, challenge.duration_days)} of{' '}
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
                      {(challenge.metrics as any[])?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {(challenge.metrics as any[]).length} metrics
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
                    {!challenge.is_public && !challenge.isParticipating && !challenge.hasRequestedToJoin && user && (
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
        })}
      </div>
    </div>
  );
}