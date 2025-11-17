import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Settings, MoreVertical, Calendar, BarChart3, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteChallengeButton from '@/components/challenges/DeleteChallengeButton';
import LeaveChallengeButton from '@/components/challenges/LeaveChallengeButton';
import CopyInviteCodeButton from '@/components/challenges/CopyInviteCodeButton';
import JoinChallengeButton from '@/components/challenges/JoinChallengeButton';
import EmailParticipantsButton from '@/components/challenges/EmailParticipantsButton';

export default async function ChallengePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch challenge details directly (RLS will handle access control)
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (challengeError || !challenge) {
    console.error('Challenge fetch error:', challengeError);
    notFound();
  }

  // Check if current user is participant (separate query due to RLS)
  let isParticipant = false;
  let participantCount = 0;
  let myParticipation: any = null;
  let myEntries: any[] = [];
  let myStats = {
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    completedDays: 0,
    totalDays: 0,
    completionRate: 0
  };

  if (user) {
    const { data: participation } = await supabase
      .from('challenge_participants')
      .select('id, current_streak, longest_streak, total_points, status')
      .eq('challenge_id', id)
      .eq('user_id', user.id)
      .single();

    myParticipation = participation;
    isParticipant = !!myParticipation;

    // Fetch entries if participant
    if (isParticipant) {
      const { data: entries } = await supabase
        .from('daily_entries')
        .select('entry_date, is_completed, points_earned, bonus_points')
        .eq('participant_id', myParticipation.id)
        .order('entry_date', { ascending: false });

      myEntries = entries || [];

      // Calculate statistics
      const completedDays = myEntries.filter(e => e.is_completed).length;
      const totalDays = Math.ceil(
        (new Date().getTime() - new Date(challenge.starts_at).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      const maxDays = Math.min(Math.max(totalDays, 0), challenge.duration_days);

      myStats = {
        currentStreak: myParticipation.current_streak || 0,
        longestStreak: myParticipation.longest_streak || 0,
        totalPoints: myParticipation.total_points || 0,
        completedDays,
        totalDays: maxDays,
        completionRate: maxDays > 0 ? Math.round((completedDays / maxDays) * 100) : 0
      };
    }
  }

  const isCreator = challenge.creator_id === user?.id;

  // Get actual participant count
  if (challenge.is_public || isCreator) {
    const { count } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'active');

    participantCount = count || 0;
  }

  // Check if user has pending join request
  let joinRequest: any = null;
  if (user && !isParticipant && !isCreator) {
    const { data: request } = await supabase
      .from('challenge_join_requests')
      .select('id, status')
      .eq('challenge_id', id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .single();

    joinRequest = request;
  }

  // Get creator profile separately
  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', challenge.creator_id)
    .single();

  const getFailureModeLabel = (mode: string) => {
    const labels = {
      strict: 'Strict - Reset on miss',
      flexible: 'Flexible - Continue with gaps',
      grace: 'Grace Period',
    };
    return labels[mode as keyof typeof labels] || mode;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{challenge.name}</h1>
              {challenge.description && (
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">{challenge.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={challenge.is_public ? 'default' : 'secondary'}>
                  {challenge.is_public ? 'Public' : 'Private'}
                </Badge>
                <Badge variant="outline">{challenge.duration_days} days</Badge>
                {isCreator && <Badge variant="secondary">You created this</Badge>}
                {isParticipant && !isCreator && <Badge variant="secondary">Participating</Badge>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:flex-wrap">
              {!isParticipant && user && !isCreator && (
                <JoinChallengeButton
                  challengeId={id}
                  isPublic={challenge.is_public}
                  hasPendingRequest={!!joinRequest}
                  requestStatus={joinRequest?.status}
                />
              )}
              {isParticipant && (
                <>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/dashboard/today">Track Today</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={`/challenges/${id}/progress`}>Leaderboard</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={`/challenges/${id}/entries`}>View All Days</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto sm:size-9 sm:px-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sm:hidden ml-2">More Options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isCreator && (
                        <>
                          <EmailParticipantsButton
                            challengeId={challenge.id}
                            challengeName={challenge.name}
                            participantCount={participantCount}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/challenges/${id}/participants`} className="cursor-pointer">
                              <Users className="mr-2 h-4 w-4" />
                              Manage Participants
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/challenges/${id}/edit`} className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <div className="w-full">
                              <DeleteChallengeButton
                                challengeId={challenge.id}
                                challengeName={challenge.name}
                              />
                            </div>
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isCreator && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <div className="w-full">
                              <LeaveChallengeButton
                                challengeId={challenge.id}
                                challengeName={challenge.name}
                              />
                            </div>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {isCreator && !isParticipant && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto sm:size-9 sm:px-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sm:hidden ml-2">More Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <EmailParticipantsButton
                      challengeId={challenge.id}
                      challengeName={challenge.name}
                      participantCount={participantCount}
                    />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/challenges/${id}/participants`} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Participants
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/challenges/${id}/edit`} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <DeleteChallengeButton
                          challengeId={challenge.id}
                          challengeName={challenge.name}
                        />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Progress Stats - Only show for participants */}
        {isParticipant && (
          <div className="mb-8">
            {/* Hero Card - Total Points */}
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 shadow-lg text-white mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold mb-1 opacity-90">Total Points</h3>
                  <div className="text-3xl sm:text-4xl font-bold">{myStats.totalPoints}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs opacity-90 mb-1">Current Streak</div>
                  <div className="text-2xl sm:text-3xl font-bold">{myStats.currentStreak}</div>
                  <div className="text-xs opacity-75">days in a row</div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Completion</div>
                  <div className="text-2xl font-bold">{myStats.completionRate}%</div>
                  <div className="text-xs text-muted-foreground">{myStats.completedDays}/{myStats.totalDays} days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Longest Streak</div>
                  <div className="text-2xl font-bold">{myStats.longestStreak}</div>
                  <div className="text-xs text-muted-foreground">personal best</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Days Left</div>
                  <div className="text-2xl font-bold">{Math.max(0, challenge.duration_days - myStats.totalDays)}</div>
                  <div className="text-xs text-muted-foreground">to complete</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Created by:</span>
                {creatorProfile?.username ? (
                  <Link
                    href={`/profile/${creatorProfile.username}`}
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors"
                  >
                    {creatorProfile.username}
                  </Link>
                ) : (
                  <p>Unknown</p>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Start Date:</span>
                <p>{format(new Date(challenge.starts_at), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">End Date:</span>
                <p>{format(new Date(challenge.ends_at), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Failure Mode:</span>
                <p>{getFailureModeLabel(challenge.failure_mode)}</p>
              </div>
              {challenge.lock_entries_after_day && (
                <Badge variant="outline">Entries lock after submission</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Metrics ({(challenge.metrics as any[])?.length || 0})</CardTitle>
              <CardDescription>What you&apos;ll track each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(challenge.metrics as any[])?.map((metric: any, index: number) => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <span className="font-medium">{metric.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {metric.type}
                    </Badge>
                    {metric.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {!challenge.is_public && challenge.invite_code && isCreator && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Invite Code</CardTitle>
              <CardDescription>Share this code with people you want to join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <code className="rounded bg-secondary px-4 py-2 text-xl font-mono">
                  {challenge.invite_code}
                </code>
                <CopyInviteCodeButton inviteCode={challenge.invite_code} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}