import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';
import CopyInviteCodeButton from '@/components/challenges/CopyInviteCodeButton';
import { AddOnetimeTaskButton } from '@/components/challenges/AddOnetimeTaskButton';
import { BatchAddTasksModal } from '@/components/challenges/BatchAddTasksModal';
import { DeadlineBadge } from '@/components/daily-entry/DeadlineBadge';
import { Infinity, Trophy, ChevronRight, Users } from 'lucide-react';
import { AchievementBadge } from '@/components/achievements/AchievementBadge';
import { calculateProgress } from '@/lib/achievements/checkAchievements';
import type { Achievement, AchievementWithProgress, ParticipantStats, AchievementCategory } from '@/lib/achievements/types';

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
      // For ongoing challenges, use totalDays directly; for fixed duration, cap at duration_days
      const isOngoing = challenge.ends_at === null;
      const maxDays = isOngoing
        ? Math.max(totalDays, 0)
        : Math.min(Math.max(totalDays, 0), challenge.duration_days || 0);

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

  // Fetch achievements for participants
  let achievementsWithProgress: AchievementWithProgress[] = [];
  let earnedCount = 0;
  let totalAchievements = 0;

  if (isParticipant && myParticipation) {
    // Get all achievements for this challenge
    const { data: achievements } = await supabase.rpc('get_challenge_achievements', {
      p_challenge_id: id,
    });

    // Get participant's earned achievements
    const { data: earnedRecords } = await supabase
      .from('participant_achievements')
      .select('achievement_id, earned_at')
      .eq('participant_id', myParticipation.id);

    const earnedMap = new Map(
      (earnedRecords || []).map((e: any) => [e.achievement_id, e.earned_at])
    );

    // Build participant stats for progress calculation
    const participantStats: ParticipantStats = {
      currentStreak: myStats.currentStreak,
      longestStreak: myStats.longestStreak,
      totalPoints: myStats.totalPoints,
      entriesCount: myEntries.length,
      perfectDays: myEntries.filter((e: any) => e.is_completed && (e.bonus_points || 0) > 0).length,
      completionRate: myStats.completionRate,
      earlyEntries: 0, // Would need submitted_at to calculate
      lateEntries: 0,
      challengeComplete: myParticipation.status === 'completed',
    };

    // Build achievements with progress
    achievementsWithProgress = (achievements || []).map((achievement: Achievement) => {
      const earned = earnedMap.has(achievement.id);
      const earned_at = earnedMap.get(achievement.id);
      const progress = !earned ? calculateProgress(achievement, participantStats) : undefined;

      return {
        ...achievement,
        earned,
        earned_at,
        progress,
      };
    });

    // Sort by display_order
    achievementsWithProgress.sort((a, b) => a.display_order - b.display_order);

    earnedCount = achievementsWithProgress.filter(a => a.earned).length;
    totalAchievements = achievementsWithProgress.length;
  }

  // Get creator profile separately
  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', challenge.creator_id)
    .single();

  // Fetch pending join requests count for creators of private challenges
  let pendingRequestsCount = 0;
  if (isCreator && !challenge.is_public) {
    const { count } = await supabase
      .from('challenge_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'pending');
    pendingRequestsCount = count || 0;
  }

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
            {challenge.ends_at === null ? (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Active Days</div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Infinity className="h-5 w-5" />
                    {myStats.totalDays}
                  </div>
                  <div className="text-xs text-muted-foreground">ongoing</div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Days Left</div>
                  <div className="text-2xl font-bold">{Math.max(0, (challenge.duration_days || 0) - myStats.totalDays)}</div>
                  <div className="text-xs text-muted-foreground">to complete</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Achievements Preview */}
          {totalAchievements > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <CardTitle className="text-base">Achievements</CardTitle>
                  </div>
                  <Link
                    href={`/challenges/${id}/achievements`}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <CardDescription>
                  {earnedCount} of {totalAchievements} earned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {/* Show earned achievements first, then in-progress, limit to 8 */}
                  {achievementsWithProgress
                    .filter(a => a.earned || (a.progress && a.progress.current > 0))
                    .slice(0, 8)
                    .map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        name={achievement.name}
                        description={achievement.description}
                        icon={achievement.icon}
                        category={achievement.category as AchievementCategory}
                        earned={achievement.earned}
                        progress={achievement.progress}
                        size="sm"
                        showName={false}
                      />
                    ))}
                  {/* Show placeholder for remaining if less than 8 visible */}
                  {achievementsWithProgress.filter(a => a.earned || (a.progress && a.progress.current > 0)).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Complete tasks to earn achievements!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
              {challenge.ends_at ? (
                <p>{format(new Date(challenge.ends_at), 'MMMM d, yyyy')}</p>
              ) : (
                <p className="flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Ongoing
                </p>
              )}
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
            {/* Tasks grouped by frequency */}
            {(() => {
              const allMetrics = (challenge.metrics as any[]) || [];
              const dailyTasks = allMetrics.filter((m: any) => m.frequency === 'daily' || !m.frequency);
              const weeklyTasks = allMetrics.filter((m: any) => m.frequency === 'weekly');
              const monthlyTasks = allMetrics.filter((m: any) => m.frequency === 'monthly');
              const onetimeTasks = allMetrics.filter((m: any) => m.frequency === 'onetime');
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const startDate = new Date(challenge.starts_at);
              const endDate = challenge.ends_at ? new Date(challenge.ends_at) : null;
              const isActive = now >= startDate && (endDate === null || now <= endDate);

              // Helper to get task status badge
              const getTaskDateBadge = (metric: any) => {
                if (!metric.starts_at && !metric.ends_at) return null;

                const startDate = metric.starts_at ? new Date(metric.starts_at) : null;
                const endDate = metric.ends_at ? new Date(metric.ends_at) : null;
                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999);

                // Task hasn't started yet
                if (startDate && now < startDate) {
                  return (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      Starts {startDate.toLocaleDateString()}
                    </Badge>
                  );
                }

                // Task has ended
                if (endDate && now > endDate) {
                  return (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Ended {endDate.toLocaleDateString()}
                    </Badge>
                  );
                }

                // Task is active with a custom end date
                if (endDate) {
                  return (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                      Until {endDate.toLocaleDateString()}
                    </Badge>
                  );
                }

                return null;
              };

              // Reusable function to render a task list
              const renderTaskList = (tasks: any[], title: string, showFrequencyBadge?: boolean) => {
                if (tasks.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      {title} ({tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.map((metric: any, index: number) => (
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
                          {metric.required && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {metric.points && (
                            <Badge variant="outline" className="text-xs">
                              {metric.points} pts
                            </Badge>
                          )}
                          {getTaskDateBadge(metric)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderTaskList(dailyTasks, 'Daily Tasks')}
                  {renderTaskList(weeklyTasks, 'Weekly Tasks')}
                  {renderTaskList(monthlyTasks, 'Monthly Tasks')}

                  {/* One-time Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        One-time Tasks ({onetimeTasks.length})
                      </h4>
                      {/* Debug: isCreator={String(isCreator)}, isActive={String(isActive)} */}
                      {isCreator && (
                        <div className="flex gap-2">
                          <BatchAddTasksModal
                            challengeId={challenge.id}
                            challengeEndDate={challenge.ends_at}
                          />
                          <AddOnetimeTaskButton
                            challengeId={challenge.id}
                            challengeEndDate={challenge.ends_at}
                          />
                        </div>
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

      {!challenge.is_public && isCreator && (
        <div className="mt-6 space-y-4">
          {/* Invite Code */}
          {challenge.invite_code && (
            <Card>
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

          {/* Pending Join Requests */}
          <Card className={pendingRequestsCount > 0 ? 'border-amber-500 dark:border-amber-400' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Join Requests</CardTitle>
                </div>
                {pendingRequestsCount > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {pendingRequestsCount} pending
                  </Badge>
                )}
              </div>
              <CardDescription>
                {pendingRequestsCount > 0
                  ? 'People are waiting to join your challenge'
                  : 'No pending requests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant={pendingRequestsCount > 0 ? 'default' : 'outline'}>
                <Link href="/challenges/requests">
                  {pendingRequestsCount > 0 ? 'Review Requests' : 'View All Requests'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}