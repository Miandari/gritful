import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TodayProgressCard } from '@/components/dashboard/TodayProgressCard';
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget';
import { DiscoverChallengesWidget } from '@/components/dashboard/DiscoverChallengesWidget';
import { ActiveChallengeCard } from '@/components/dashboard/ActiveChallengeCard';
import { CreatorRibbon } from '@/components/challenges/CreatorBadge';
import { Target, UserPlus } from 'lucide-react';
import { getChallengeState, ChallengeStateResult } from '@/lib/utils/challengeState';
import { format, subDays } from 'date-fns';

// Top-level dashboard page. Does only the auth check + Suspense composition
// so it can return JSX (and flush the streamed shell) as early as possible.
// All data fetching happens inside the child components, each behind its
// own Suspense boundary so fast sections paint before slow ones.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<WelcomeHeaderSkeleton />}>
        <WelcomeHeader userId={user.id} />
      </Suspense>
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}

// =====================================================================
// Welcome header — fast path. Only depends on a single-row profile query
// (select by primary key), so it resolves and paints almost instantly.
// =====================================================================

async function WelcomeHeader({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground">
        Welcome back, {profile?.username || 'there'}!
      </h1>
    </div>
  );
}

function WelcomeHeaderSkeleton() {
  return (
    <div>
      <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

// =====================================================================
// Main dashboard content — the heavy path. Runs all the queries from
// Phase 1 in two parallel batches, then renders the full grid. Wrapped
// in its own Suspense so the welcome header can stream in first.
// =====================================================================

async function DashboardContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Pre-compute date strings used by multiple queries below
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
  const serverTodayStr = format(new Date(), 'yyyy-MM-dd');

  // Batch A: all queries whose only dependency is userId run in parallel.
  // (Profile has moved to WelcomeHeader and is no longer in this batch.)
  const [
    { data: myParticipations },
    { data: myCreatedChallenges },
    { data: featuredChallenges },
    { data: joinRequests },
  ] = await Promise.all([
    supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('challenges')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }),
    // Featured challenges (both public and private) for sidebar - include
    // ongoing challenges. Note: Using server date for challenge filtering
    // is acceptable (slight timezone offset is fine for discovery).
    supabase
      .from('challenges')
      .select('*')
      .lte('starts_at', serverTodayStr)
      .or(`ends_at.is.null,ends_at.gte.${serverTodayStr}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('challenge_join_requests')
      .select('challenge_id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved']),
  ]);

  // Separate active challenges (where user is participant) and
  // created-only challenges. Only include challenges that are active, in
  // grace period, or ongoing.
  const activeChallenges: any[] = [];
  const createdOnlyChallenges: any[] = [];

  if (myParticipations) {
    for (const participation of myParticipations) {
      if (participation.challenges) {
        const challengeState = getChallengeState(participation.challenges);
        if (challengeState.state === 'active' ||
            challengeState.state === 'grace_period' ||
            challengeState.state === 'ongoing') {
          activeChallenges.push({
            id: participation.id,
            challenge_id: participation.challenge_id,
            current_streak: participation.current_streak,
            longest_streak: participation.longest_streak,
            total_points: participation.total_points || 0,
            challenge: participation.challenges,
            challengeState,
          });
        }
      }
    }
  }

  if (myCreatedChallenges) {
    for (const challenge of myCreatedChallenges) {
      const isParticipating = activeChallenges.some(
        ac => ac.challenge_id === challenge.id
      );
      if (!isParticipating) {
        createdOnlyChallenges.push(challenge);
      }
    }
  }

  // Derive IDs needed by Batch B, with null-safe fallbacks (Supabase
  // returns { data: null, error } rather than throwing on query failure).
  const participationIds = activeChallenges.map(p => p.id);
  const featuredIds = featuredChallenges?.map(c => c.id) ?? [];
  const privateCreatedChallengeIds =
    myCreatedChallenges?.filter(c => !c.is_public).map(c => c.id) ?? [];

  // Batch B: queries that depend on Batch A's results. Each is gated on
  // whether its inputs exist.
  const [
    recentEntriesResult,
    participantCountsResult,
    pendingCountResult,
  ] = await Promise.all([
    participationIds.length > 0
      ? supabase
          .from('daily_entries')
          .select('participant_id, is_completed, entry_date')
          .in('participant_id', participationIds)
          .gte('entry_date', threeDaysAgo)
      : Promise.resolve({ data: [] as any[] }),
    featuredIds.length > 0
      ? supabase.rpc('get_challenge_participant_counts', {
          challenge_ids: featuredIds,
        })
      : Promise.resolve({ data: [] as any[] }),
    privateCreatedChallengeIds.length > 0
      ? supabase
          .from('challenge_join_requests')
          .select('*', { count: 'exact', head: true })
          .in('challenge_id', privateCreatedChallengeIds)
          .eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
  ]);

  const recentEntries = recentEntriesResult.data ?? [];
  const participantCounts = participantCountsResult.data ?? null;
  const pendingJoinRequestsCount = pendingCountResult.count ?? 0;

  // Calculate overall stats
  const totalPoints = activeChallenges.reduce((sum, p) => sum + (p.total_points || 0), 0);
  const longestStreak = Math.max(...activeChallenges.map(p => p.longest_streak || 0), 0);
  const activeStreaksCount = activeChallenges.filter(p => (p.current_streak || 0) > 0).length;

  // Build challenges-with-counts from the featured list + RPC result.
  let challengesWithCounts = featuredChallenges || [];
  if (featuredChallenges && featuredChallenges.length > 0) {
    const countsMap = new Map<string, number>();
    participantCounts?.forEach((item: { challenge_id: string; participant_count: number }) => {
      countsMap.set(item.challenge_id, item.participant_count);
    });

    challengesWithCounts = featuredChallenges.map(challenge => ({
      ...challenge,
      challenge_participants: [{ count: countsMap.get(challenge.id) || 0 }]
    }));
  }

  // Filter out challenges user is already participating in
  const availableChallenges = challengesWithCounts.filter(challenge =>
    !activeChallenges.some(ac => ac.challenge_id === challenge.id)
  );

  // Determine if user is new (no active challenges)
  const isNewUser = activeChallenges.length === 0;

  return (
    <>
      {/* Welcome subtitle (depends on active challenge count) */}
      <p className="-mt-4 text-muted-foreground">
        {activeChallenges.length > 0
          ? `You have ${activeChallenges.length} active ${
              activeChallenges.length === 1 ? 'challenge' : 'challenges'
            }`
          : 'Start your journey by creating or joining a challenge'}
      </p>

      {/* Pending Join Requests Notification */}
      {pendingJoinRequestsCount > 0 && (
        <Card className="border-amber-500 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {pendingJoinRequestsCount} pending join {pendingJoinRequestsCount === 1 ? 'request' : 'requests'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    People want to join your private challenges
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/challenges/requests">Review Requests</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New User Layout - Get Started as Main Card */}
      {isNewUser ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Get Started */}
          <div className="lg:col-span-2">
            <DiscoverChallengesWidget
              challenges={availableChallenges}
              isNewUser={true}
              joinRequests={joinRequests || []}
              showMore={true}
              currentUserId={userId}
            />
          </div>

          {/* Right Sidebar - Track Today Button */}
          <div>
            <Card>
              <CardContent className="p-4">
                <Button asChild className="w-full" size="lg">
                  <Link href="/dashboard/today">
                    <Target className="mr-2 h-5 w-5" />
                    Track Today
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Existing User Layout */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Today's Progress Card */}
            <TodayProgressCard
              activeChallenges={activeChallenges}
              recentEntries={recentEntries || []}
            />

            {/* Active Challenges */}
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Active Challenges</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeChallenges.map((participation: any) => {
                  const challenge = participation.challenge;
                  const challengeState = participation.challengeState as ChallengeStateResult;
                  if (!challenge) return null;

                  // Filter recent entries for this participation
                  const participantEntries = recentEntries?.filter(
                    e => e.participant_id === participation.id
                  ) || [];

                  return (
                    <ActiveChallengeCard
                      key={participation.id}
                      participation={{
                        id: participation.id,
                        challenge_id: participation.challenge_id,
                        current_streak: participation.current_streak,
                        longest_streak: participation.longest_streak,
                        total_points: participation.total_points,
                      }}
                      challenge={{
                        id: challenge.id,
                        name: challenge.name,
                        description: challenge.description,
                        starts_at: challenge.starts_at,
                        ends_at: challenge.ends_at,
                        duration_days: challenge.duration_days,
                        creator_id: challenge.creator_id,
                        is_public: challenge.is_public,
                      }}
                      challengeState={challengeState}
                      recentEntries={participantEntries}
                      currentUserId={userId}
                    />
                  );
                })}
              </div>
            </div>

            {/* Discover More - Below Active Challenges for existing users */}
            {availableChallenges.length > 0 && (
              <div>
                <DiscoverChallengesWidget
                  challenges={availableChallenges}
                  isNewUser={false}
                  joinRequests={joinRequests || []}
                  showMore={true}
                  currentUserId={userId}
                />
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats Widget */}
            <QuickStatsWidget
              totalPoints={totalPoints}
              longestStreak={longestStreak}
              activeStreaksCount={activeStreaksCount}
              totalChallenges={activeChallenges.length}
            />

            {/* Track Today Quick Action */}
            <Card>
              <CardContent className="p-4">
                <Button asChild className="w-full" size="lg">
                  <Link href="/dashboard/today">
                    <Target className="mr-2 h-5 w-5" />
                    Track Today
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Created Challenges (if any that user is not participating in) */}
      {createdOnlyChallenges.length > 0 && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-foreground">Challenges You Created</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {createdOnlyChallenges.map((challenge: any) => {
              const isOngoing = challenge.ends_at === null;
              return (
                <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                  <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
                    <CreatorRibbon showOngoing={isOngoing} />
                    <CardHeader className="pt-8">
                      <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {challenge.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant={challenge.is_public ? 'default' : 'secondary'}>
                          {challenge.is_public ? 'Public' : 'Private'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {isOngoing ? 'No end date' : `${challenge.duration_days} days`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// Skeleton matching the main content shape. The subtitle placeholder sits
// just under the welcome header space so the transition feels continuous.
function DashboardContentSkeleton() {
  return (
    <>
      {/* Subtitle placeholder */}
      <div className="-mt-4 h-5 w-80 animate-pulse rounded-md bg-muted" />

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>

          <div>
            <div className="mb-4 h-7 w-48 animate-pulse rounded-md bg-muted" />
            <div className="grid gap-4 md:grid-cols-2">
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 h-6 w-32 animate-pulse rounded-md bg-muted" />
            <div className="space-y-4">
              <StatsRowSkeleton />
              <StatsRowSkeleton />
              <StatsRowSkeleton />
              <StatsRowSkeleton />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </>
  );
}

function ChallengeCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-3 h-6 w-3/4 animate-pulse rounded-md bg-muted" />
      <div className="mb-4 h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

function StatsRowSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-5 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}
