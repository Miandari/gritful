import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import CopyInviteCodeButton from '@/components/challenges/CopyInviteCodeButton';
import { AddOnetimeTaskButton } from '@/components/challenges/AddOnetimeTaskButton';
import { DeadlineBadge } from '@/components/daily-entry/DeadlineBadge';

export default async function ChallengeOverviewPage({
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

  // Fetch challenge details
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (challengeError || !challenge) {
    console.error('Challenge fetch error:', challengeError);
    notFound();
  }

  const isCreator = challenge.creator_id === user?.id;

  // Check if current user is participant and get their stats
  let isParticipant = false;
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
    <>
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
            <CardTitle>Tasks</CardTitle>
            <CardDescription>What you&apos;ll track during this challenge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Tasks */}
            {(() => {
              const dailyTasks = (challenge.metrics as any[])?.filter(
                (m: any) => m.frequency !== 'onetime'
              ) || [];
              const onetimeTasks = (challenge.metrics as any[])?.filter(
                (m: any) => m.frequency === 'onetime'
              ) || [];
              const now = new Date();
              const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);

              return (
                <>
                  {dailyTasks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Daily Tasks ({dailyTasks.length})
                      </h4>
                      <div className="space-y-2">
                        {dailyTasks.map((metric: any, index: number) => (
                          <div key={metric.id} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{index + 1}.</span>
                            <Link
                              href={`/challenges/${challenge.id}/entries`}
                              className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors"
                            >
                              {metric.name}
                            </Link>
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
                    </div>
                  )}

                  {/* One-time Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        One-time Tasks ({onetimeTasks.length})
                      </h4>
                      {/* Debug: isCreator={String(isCreator)}, isActive={String(isActive)} */}
                      {isCreator && (
                        <AddOnetimeTaskButton
                          challengeId={challenge.id}
                          challengeEndDate={challenge.ends_at}
                        />
                      )}
                    </div>
                    {onetimeTasks.length > 0 ? (
                      <div className="space-y-2">
                        {onetimeTasks.map((metric: any, index: number) => (
                          <div key={metric.id} className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">{index + 1}.</span>
                            <Link
                              href={`/challenges/${challenge.id}/entries`}
                              className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors"
                            >
                              {metric.name}
                            </Link>
                            <Badge variant="secondary" className="text-xs">
                              {metric.type}
                            </Badge>
                            {metric.points && (
                              <Badge variant="outline" className="text-xs">
                                {metric.points} pts
                              </Badge>
                            )}
                            {metric.deadline && (
                              <DeadlineBadge deadline={metric.deadline} className="text-xs" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {isCreator
                          ? 'No one-time tasks yet. Add one above!'
                          : 'No one-time tasks in this challenge.'}
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
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
    </>
  );
}