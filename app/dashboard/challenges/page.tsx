import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Users, TrendingUp, Plus, Search, Infinity, Clock } from 'lucide-react';
import { CreatorBadge } from '@/components/challenges/CreatorBadge';
import { format } from 'date-fns';

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current tab from URL or default to 'active'
  const currentTab = params?.tab || 'active';

  // Get user's active participations
  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select(`
      *,
      challenges (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Get challenges user created (active ones)
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: myCreatedChallenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('creator_id', user.id)
    .or(`ends_at.is.null,ends_at.gte.${todayStr}`)
    .order('created_at', { ascending: false });

  // Get history: challenges that ended or where participation status is completed/failed
  const { data: historyByStatus } = await supabase
    .from('challenge_participants')
    .select(`*, challenges (*)`)
    .eq('user_id', user.id)
    .or('status.eq.completed,status.eq.failed');

  const { data: historyByEndDate } = await supabase
    .from('challenge_participants')
    .select(`*, challenges (*)`)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Filter to only active challenges that haven't ended
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeChallenges: any[] = [];
  if (myParticipations) {
    for (const participation of myParticipations) {
      if (participation.challenges) {
        const endDate = participation.challenges.ends_at
          ? new Date(participation.challenges.ends_at)
          : null;
        // Include if ongoing (no end date) or end date >= today
        if (endDate === null || endDate >= now) {
          activeChallenges.push({
            id: participation.id,
            challenge_id: participation.challenge_id,
            current_streak: participation.current_streak,
            longest_streak: participation.longest_streak,
            total_points: participation.total_points || 0,
            challenge: participation.challenges,
          });
        }
      }
    }
  }

  // Build history list (deduplicated)
  const historyMap = new Map<string, any>();

  // Add from status-based history
  if (historyByStatus) {
    for (const participation of historyByStatus) {
      if (participation.challenges) {
        historyMap.set(participation.challenge_id, {
          id: participation.id,
          challenge_id: participation.challenge_id,
          current_streak: participation.current_streak,
          longest_streak: participation.longest_streak,
          total_points: participation.total_points || 0,
          status: participation.status,
          challenge: participation.challenges,
        });
      }
    }
  }

  // Add from date-based history (challenges that ended)
  if (historyByEndDate) {
    for (const participation of historyByEndDate) {
      if (participation.challenges) {
        const endDate = participation.challenges.ends_at
          ? new Date(participation.challenges.ends_at)
          : null;
        // Only include if challenge has ended (end date < today)
        if (endDate !== null && endDate < now) {
          historyMap.set(participation.challenge_id, {
            id: participation.id,
            challenge_id: participation.challenge_id,
            current_streak: participation.current_streak,
            longest_streak: participation.longest_streak,
            total_points: participation.total_points || 0,
            status: participation.status,
            challenge: participation.challenges,
          });
        }
      }
    }
  }

  const historyChallenges = Array.from(historyMap.values());

  // Fetch today's entries for active challenges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStrEntry = today.toISOString().split('T')[0];

  const { data: todayEntries } = await supabase
    .from('daily_entries')
    .select('participant_id, is_completed, entry_date')
    .in(
      'participant_id',
      activeChallenges.map((p) => p.id)
    )
    .eq('entry_date', todayStrEntry);

  const hasNoChallenges =
    activeChallenges.length === 0 &&
    (myCreatedChallenges?.length || 0) === 0 &&
    historyChallenges.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Challenges</h1>
          <p className="mt-2 text-muted-foreground">
            {hasNoChallenges
              ? 'Start your journey by creating or joining a challenge'
              : `Managing ${activeChallenges.length + (myCreatedChallenges?.length || 0)} active ${
                  activeChallenges.length + (myCreatedChallenges?.length || 0) === 1
                    ? 'challenge'
                    : 'challenges'
                }`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/challenges/browse">
              <Search className="mr-2 h-4 w-4" />
              Browse
            </Link>
          </Button>
          <Button asChild>
            <Link href="/challenges/create">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="active" asChild>
            <Link
              href="/dashboard/challenges?tab=active"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Active</span>
              {activeChallenges.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeChallenges.length}
                </Badge>
              )}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="created" asChild>
            <Link
              href="/dashboard/challenges?tab=created"
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Created</span>
              {(myCreatedChallenges?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {myCreatedChallenges?.length}
                </Badge>
              )}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="history" asChild>
            <Link
              href="/dashboard/challenges?tab=history"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {historyChallenges.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {historyChallenges.length}
                </Badge>
              )}
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Active Tab */}
        <TabsContent value="active">
          {activeChallenges.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                <p className="text-muted-foreground mb-4">
                  Join or create a challenge to start tracking your progress
                </p>
                <div className="flex gap-2 justify-center">
                  <Button asChild>
                    <Link href="/challenges/browse">Browse</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/challenges/create">Create</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeChallenges.map((participation: any) => {
                const challenge = participation.challenge;
                if (!challenge) return null;

                const cardToday = new Date();
                cardToday.setHours(0, 0, 0, 0);
                const startDate = new Date(challenge.starts_at);
                startDate.setHours(0, 0, 0, 0);

                const daysElapsed = Math.max(
                  0,
                  Math.floor(
                    (cardToday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                  )
                );
                const isOngoing = challenge.ends_at === null;
                const progress = isOngoing
                  ? null
                  : Math.min(100, (daysElapsed / challenge.duration_days) * 100);
                const todayEntry = todayEntries?.find(
                  (e) => e.participant_id === participation.id
                );
                const isCreator = challenge.creator_id === user.id;

                return (
                  <Card
                    key={participation.id}
                    className="transition-shadow hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {challenge.description || 'No description'}
                          </CardDescription>
                        </div>
                        {isOngoing ? (
                          <Badge
                            variant="outline"
                            className="ml-2 shrink-0 flex items-center gap-1"
                          >
                            <Infinity className="h-3 w-3" />
                            Ongoing
                          </Badge>
                        ) : (
                          <Badge
                            variant={challenge.is_public ? 'default' : 'secondary'}
                            className="ml-2 shrink-0"
                          >
                            {challenge.is_public ? 'Public' : 'Private'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {isOngoing ? 'Active' : 'Progress'}
                          </span>
                          <span className="font-medium">
                            {isOngoing
                              ? `Day ${daysElapsed + 1}`
                              : `Day ${Math.min(daysElapsed + 1, challenge.duration_days)} of ${challenge.duration_days}`}
                          </span>
                        </div>
                        {!isOngoing && (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Points</div>
                            <div className="font-semibold">{participation.total_points}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Streak</div>
                            <div className="font-semibold">
                              {participation.current_streak}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Today</div>
                            <div className="font-semibold">
                              {todayEntry?.is_completed ? (
                                <span className="text-green-600">Done</span>
                              ) : (
                                <span className="text-amber-600">Pending</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isCreator && <CreatorBadge />}
                        <div className="flex gap-2 pt-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link href={`/challenges/${challenge.id}`}>View Details</Link>
                          </Button>
                          {!todayEntry?.is_completed && (
                            <Button asChild size="sm" variant="outline" className="flex-1">
                              <Link href="/dashboard/today">Track</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Created Tab */}
        <TabsContent value="created">
          {(myCreatedChallenges?.length || 0) === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Challenges Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first challenge and invite others to join
                </p>
                <Button asChild>
                  <Link href="/challenges/create">Create Challenge</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myCreatedChallenges?.map((challenge: any) => {
                const isOngoing = challenge.ends_at === null;
                // Find participation data if user is also participating
                const participation = activeChallenges.find(
                  (ac) => ac.challenge_id === challenge.id
                );

                return (
                  <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                    <Card className="transition-shadow hover:shadow-lg h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {challenge.description || 'No description'}
                            </CardDescription>
                          </div>
                          {isOngoing ? (
                            <Badge
                              variant="outline"
                              className="ml-2 shrink-0 flex items-center gap-1"
                            >
                              <Infinity className="h-3 w-3" />
                              Ongoing
                            </Badge>
                          ) : (
                            <Badge
                              variant={challenge.is_public ? 'default' : 'secondary'}
                              className="ml-2 shrink-0"
                            >
                              {challenge.is_public ? 'Public' : 'Private'}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Calendar className="mr-1 h-4 w-4" />
                              Duration
                            </div>
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
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Users className="mr-1 h-4 w-4" />
                              Type
                            </div>
                            <span className="font-medium">
                              {challenge.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                          {participation && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Your Points</span>
                              <span className="font-medium">{participation.total_points}</span>
                            </div>
                          )}
                          <div className="pt-2">
                            <CreatorBadge />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {historyChallenges.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Challenge History</h3>
                <p className="text-muted-foreground">
                  Completed challenges will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {historyChallenges.map((participation: any) => {
                const challenge = participation.challenge;
                if (!challenge) return null;

                const isCreator = challenge.creator_id === user.id;
                const isOngoing = challenge.duration_days === null;

                return (
                  <Link key={participation.id} href={`/challenges/${challenge.id}`}>
                    <Card className="transition-shadow hover:shadow-lg h-full opacity-80">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {challenge.description || 'No description'}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            Completed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Final Stats */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs">Final Points</div>
                              <div className="font-semibold">{participation.total_points}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Best Streak</div>
                              <div className="font-semibold">
                                {participation.longest_streak}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Duration</div>
                              <div className="font-semibold">
                                {isOngoing ? (
                                  <span className="flex items-center gap-1">
                                    <Infinity className="h-3 w-3" />
                                  </span>
                                ) : (
                                  `${challenge.duration_days}d`
                                )}
                              </div>
                            </div>
                          </div>

                          {/* End date info */}
                          {challenge.ends_at && (
                            <div className="text-sm text-muted-foreground">
                              Ended: {format(new Date(challenge.ends_at), 'MMM d, yyyy')}
                            </div>
                          )}

                          {/* Creator badge if applicable */}
                          {isCreator && <CreatorBadge />}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
