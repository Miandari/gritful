import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Users, TrendingUp, Plus, Search, Infinity } from 'lucide-react';

export default async function ChallengesPage() {
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

  // Separate active challenges and created challenges
  const activeChallenges: any[] = [];
  const createdOnlyChallenges: any[] = [];

  if (myParticipations) {
    for (const participation of myParticipations) {
      if (participation.challenges) {
        activeChallenges.push({
          id: participation.id,
          challenge_id: participation.challenge_id,
          current_streak: participation.current_streak,
          longest_streak: participation.longest_streak,
          total_points: participation.total_points || 0,
          challenge: participation.challenges
        });
      }
    }
  }

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

  // Fetch today's entries for all active challenges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data: todayEntries } = await supabase
    .from('daily_entries')
    .select('participant_id, is_completed, entry_date')
    .in('participant_id', activeChallenges.map(p => p.id))
    .eq('entry_date', todayStr);

  // Fetch available challenges for discovery (include ongoing challenges)
  const { data: availableChallenges } = await supabase
    .from('challenges')
    .select('*')
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString().split('T')[0]}`)
    .order('created_at', { ascending: false })
    .limit(6);

  // Filter out challenges user is already participating in
  const discoverChallenges = availableChallenges?.filter(challenge =>
    !activeChallenges.some(ac => ac.challenge_id === challenge.id)
  ) || [];

  const hasNoChallenges = activeChallenges.length === 0 && createdOnlyChallenges.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Challenges</h1>
          <p className="mt-2 text-muted-foreground">
            {hasNoChallenges
              ? 'Start your journey by creating or joining a challenge'
              : `Managing ${activeChallenges.length + createdOnlyChallenges.length} ${
                  activeChallenges.length + createdOnlyChallenges.length === 1 ? 'challenge' : 'challenges'
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

      {/* Empty State */}
      {hasNoChallenges ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Challenges Yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              You haven't joined or created any challenges yet. Start tracking your habits and compete with friends!
            </p>
            <div className="flex gap-3">
              <Button asChild size="lg">
                <Link href="/challenges/browse">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Challenges
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/challenges/create">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Challenge
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Challenges Section */}
          {activeChallenges.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-foreground flex items-center">
                <TrendingUp className="mr-2 h-6 w-6 text-blue-600" />
                Active Challenges
                <Badge variant="secondary" className="ml-3">
                  {activeChallenges.length}
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeChallenges.map((participation: any) => {
                  const challenge = participation.challenge;
                  if (!challenge) return null;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const startDate = new Date(challenge.starts_at);
                  startDate.setHours(0, 0, 0, 0);

                  const daysElapsed = Math.max(0, Math.floor(
                    (today.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  ));
                  const isOngoing = challenge.ends_at === null;
                  const progress = isOngoing ? null : Math.min(100, (daysElapsed / challenge.duration_days) * 100);
                  const todayEntry = todayEntries?.find(e => e.participant_id === participation.id);

                  return (
                    <Card key={participation.id} className="transition-shadow hover:shadow-lg">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {challenge.description || 'No description'}
                            </CardDescription>
                          </div>
                          {isOngoing ? (
                            <Badge variant="outline" className="ml-2 shrink-0 flex items-center gap-1">
                              <Infinity className="h-3 w-3" />
                              Ongoing
                            </Badge>
                          ) : (
                            <Badge variant={challenge.is_public ? 'default' : 'secondary'} className="ml-2 shrink-0">
                              {challenge.is_public ? 'Public' : 'Private'}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{isOngoing ? 'Active' : 'Progress'}</span>
                            <span className="font-medium">
                              {isOngoing
                                ? `Day ${daysElapsed + 1}`
                                : `Day ${Math.min(daysElapsed + 1, challenge.duration_days)} of ${challenge.duration_days}`
                              }
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
                              <div className="font-semibold">{participation.current_streak}</div>
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
            </div>
          )}

          {/* Created Challenges Section */}
          {createdOnlyChallenges.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-foreground flex items-center">
                <Trophy className="mr-2 h-6 w-6 text-purple-600" />
                Challenges You Created
                <Badge variant="secondary" className="ml-3">
                  {createdOnlyChallenges.length}
                </Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {createdOnlyChallenges.map((challenge: any) => (
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
                          <Badge variant={challenge.is_public ? 'default' : 'secondary'} className="ml-2 shrink-0">
                            {challenge.is_public ? 'Public' : 'Private'}
                          </Badge>
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
                              {challenge.ends_at === null ? (
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
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Discover Section - Always show if there are challenges to discover */}
      {discoverChallenges.length > 0 && (
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-foreground flex items-center">
            <Search className="mr-2 h-6 w-6 text-green-600" />
            Discover Challenges
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {discoverChallenges.slice(0, 6).map((challenge: any) => {
              const isOngoing = challenge.ends_at === null;

              return (
                <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                  <Card className="transition-shadow hover:shadow-lg h-full border-dashed">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="line-clamp-1">{challenge.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {challenge.description || 'No description'}
                          </CardDescription>
                        </div>
                        {isOngoing ? (
                          <Badge variant="outline" className="ml-2 shrink-0 flex items-center gap-1">
                            <Infinity className="h-3 w-3" />
                            Ongoing
                          </Badge>
                        ) : (
                          <Badge variant={challenge.is_public ? 'default' : 'secondary'} className="ml-2 shrink-0">
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
                        <Button asChild size="sm" variant="outline" className="w-full mt-2">
                          <Link href={`/challenges/${challenge.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <Button asChild variant="outline">
              <Link href="/challenges/browse">
                View All Challenges
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
