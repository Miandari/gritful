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
import { cn } from '@/lib/utils';
import { getTodayDateString } from '@/lib/utils/dates';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user's active participations
  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select(`
      *,
      challenges (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Get challenges user created
  const { data: myCreatedChallenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  // Separate active challenges (where user is participant) and created-only challenges
  // Only include challenges that are active, in grace period, or ongoing
  const activeChallenges: any[] = [];
  const createdOnlyChallenges: any[] = [];

  if (myParticipations) {
    for (const participation of myParticipations) {
      if (participation.challenges) {
        const challengeState = getChallengeState(participation.challenges);
        // Only include if challenge is active, in grace period, or ongoing (not archived)
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

  // Fetch today's entries for all active challenges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getTodayDateString();

  const { data: todayEntries } = await supabase
    .from('daily_entries')
    .select('participant_id, is_completed, entry_date')
    .in('participant_id', activeChallenges.map(p => p.id))
    .eq('entry_date', todayStr);

  // Calculate overall stats
  const totalPoints = activeChallenges.reduce((sum, p) => sum + (p.total_points || 0), 0);
  const longestStreak = Math.max(...activeChallenges.map(p => p.longest_streak || 0), 0);
  const activeStreaksCount = activeChallenges.filter(p => (p.current_streak || 0) > 0).length;

  if (myCreatedChallenges) {
    for (const challenge of myCreatedChallenges) {
      // Check if user is also participating
      const isParticipating = activeChallenges.some(
        ac => ac.challenge_id === challenge.id
      );
      if (!isParticipating) {
        createdOnlyChallenges.push(challenge);
      }
    }
  }

  // Fetch featured challenges (both public and private) for sidebar - include ongoing challenges
  const { data: featuredChallenges } = await supabase
    .from('challenges')
    .select('*')
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gte.${getTodayDateString()}`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch participant counts for all challenges using RPC function (bypasses RLS)
  let challengesWithCounts = featuredChallenges || [];
  if (featuredChallenges && featuredChallenges.length > 0) {
    const challengeIds = featuredChallenges.map(c => c.id);

    // Use RPC function to get counts (this bypasses RLS and is safe for public counts)
    const { data: participantCounts } = await supabase
      .rpc('get_challenge_participant_counts', { challenge_ids: challengeIds });

    // Create a map of challenge_id to count
    const countsMap = new Map<string, number>();
    participantCounts?.forEach((item: { challenge_id: string; participant_count: number }) => {
      countsMap.set(item.challenge_id, item.participant_count);
    });

    // Add counts to challenges
    challengesWithCounts = featuredChallenges.map(challenge => ({
      ...challenge,
      challenge_participants: [{ count: countsMap.get(challenge.id) || 0 }]
    }));
  }

  // Filter out challenges user is already participating in
  const availableChallenges = challengesWithCounts.filter(challenge =>
    !activeChallenges.some(ac => ac.challenge_id === challenge.id)
  );

  // Check if user has pending join requests
  const { data: joinRequests } = await supabase
    .from('join_requests')
    .select('challenge_id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved']);

  // Check for pending join requests TO the user's created private challenges
  let pendingJoinRequestsCount = 0;
  const privateCreatedChallengeIds = myCreatedChallenges
    ?.filter(c => !c.is_public)
    ?.map(c => c.id) || [];

  if (privateCreatedChallengeIds.length > 0) {
    const { count } = await supabase
      .from('challenge_join_requests')
      .select('*', { count: 'exact', head: true })
      .in('challenge_id', privateCreatedChallengeIds)
      .eq('status', 'pending');
    pendingJoinRequestsCount = count || 0;
  }

  // Determine if user is new (no active challenges)
  const isNewUser = activeChallenges.length === 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.username || 'there'}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          {activeChallenges.length > 0
            ? `You have ${activeChallenges.length} active ${
                activeChallenges.length === 1 ? 'challenge' : 'challenges'
              }`
            : 'Start your journey by creating or joining a challenge'}
        </p>
      </div>

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
              currentUserId={user.id}
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
              todayEntries={todayEntries || []}
            />

            {/* Active Challenges */}
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Active Challenges</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeChallenges.map((participation: any) => {
                  const challenge = participation.challenge;
                  const challengeState = participation.challengeState as ChallengeStateResult;
                  if (!challenge) return null;

                  const todayEntry = todayEntries?.find(e => e.participant_id === participation.id);

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
                      }}
                      challengeState={challengeState}
                      todayEntry={todayEntry ? { is_completed: todayEntry.is_completed } : null}
                      currentUserId={user.id}
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
                  currentUserId={user.id}
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
    </div>
  );
}