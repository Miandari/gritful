import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ProgressCalendar } from '@/components/progress/ProgressCalendar';
import { StreakDisplay } from '@/components/progress/StreakDisplay';
import { ParticipantsLeaderboard } from '@/components/progress/ParticipantsLeaderboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProgressStatsSection } from '@/components/progress/ProgressStatsSection';
import { ProgressTimelineCards } from '@/components/progress/ProgressTimelineCards';

export const revalidate = 0;

export default async function ProgressPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch challenge details
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (challengeError || !challenge) {
    notFound();
  }

  // Check if user is participant
  const { data: myParticipation } = await supabase
    .from('challenge_participants')
    .select('id, current_streak, longest_streak, status, total_points')
    .eq('challenge_id', id)
    .eq('user_id', user.id)
    .single();

  if (!myParticipation) {
    notFound();
  }

  // Fetch my entries
  const { data: myEntries } = await supabase
    .from('daily_entries')
    .select('entry_date, is_completed, points_earned, bonus_points, submitted_at')
    .eq('participant_id', myParticipation.id)
    .order('entry_date', { ascending: true });

  // Fetch my one-time task completions
  const { data: myOnetimeCompletions } = await supabase
    .from('onetime_task_completions')
    .select('task_id, points_earned, completed_at')
    .eq('participant_id', myParticipation.id);

  // Fetch my periodic task completions (weekly/monthly)
  const { data: myPeriodicCompletions } = await supabase
    .from('periodic_task_completions')
    .select('*')
    .eq('participant_id', myParticipation.id);

  // Calculate one-time task stats
  const onetimeTasks = (challenge.metrics as any[])?.filter(
    (m: any) => m.frequency === 'onetime'
  ) || [];
  const onetimeTasksCompleted = myOnetimeCompletions?.length || 0;
  const onetimeTasksTotal = onetimeTasks.length;
  const onetimePoints = myOnetimeCompletions?.reduce(
    (sum, c) => sum + (c.points_earned || 0), 0
  ) || 0;

  // Calculate my statistics (date calculations moved to client for correct timezone)
  const myCompletedDays = myEntries?.filter(e => e.is_completed).length || 0;

  // Fetch all participants (without join to avoid schema cache issues)
  const { data: allParticipants, error: participantsError } = await supabase
    .from('challenge_participants')
    .select('id, user_id, current_streak, longest_streak, total_points, status')
    .eq('challenge_id', id);

  if (participantsError) {
    console.error('Error fetching participants:', participantsError);
  }

  // Fetch profiles separately
  const userIds = allParticipants?.map(p => p.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  // Create a map of user_id to profile
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Merge participants with profiles
  const participantsWithProfiles = allParticipants?.map(p => ({
    ...p,
    profile: profileMap.get(p.user_id) || { username: 'Unknown User', avatar_url: null }
  })) || [];

  // Fetch all entries for all participants
  const participantIds = allParticipants?.map(p => p.id) || [];
  const { data: allEntries } = await supabase
    .from('daily_entries')
    .select('participant_id, entry_date, is_completed, metric_data, notes, points_earned, bonus_points, submitted_at')
    .in('participant_id', participantIds)
    .order('entry_date', { ascending: true });

  // Group entries by participant
  const entriesByParticipant = allEntries?.reduce((acc, entry) => {
    if (!acc[entry.participant_id]) {
      acc[entry.participant_id] = [];
    }
    acc[entry.participant_id].push(entry);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Calculate stats for each participant
  const participantsWithStats = participantsWithProfiles
    .map(participant => {
      const entries = entriesByParticipant[participant.id] || [];
      const completedDays = entries.filter(e => e.is_completed).length;
      const lastActivity = entries.length > 0
        ? entries[entries.length - 1].entry_date
        : null;

      return {
        ...participant,
        completedDays,
        lastActivity,
        entries,
      };
    })
    .sort((a, b) => {
      // Sort by total points (descending), then by current streak (descending)
      if (b.total_points !== a.total_points) {
        return (b.total_points || 0) - (a.total_points || 0);
      }
      return (b.current_streak || 0) - (a.current_streak || 0);
    });

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button asChild variant="ghost" className="mb-4" size="sm">
            <Link href={`/challenges/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Challenge
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Challenge Progress</h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">{challenge.name}</p>
          </div>
        </div>

        {/* Quick Personal Stats - uses ProgressStatsSection for correct client-side timezone handling */}
        <ProgressStatsSection
          startsAt={challenge.starts_at}
          endsAt={challenge.ends_at}
          durationDays={challenge.duration_days}
          myCompletedDays={myCompletedDays}
          currentStreak={myParticipation.current_streak || 0}
          longestStreak={myParticipation.longest_streak || 0}
          totalPoints={myParticipation.total_points || 0}
          onetimePoints={onetimePoints}
          rank={participantsWithStats.findIndex(p => p.user_id === user.id) + 1}
          totalParticipants={participantsWithStats.length}
        />

        {/* Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="your-progress">Your Progress</TabsTrigger>
          </TabsList>

          {/* Your Progress Tab */}
          <TabsContent value="your-progress" className="space-y-8">
            {/* Points Card */}
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 shadow-lg text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold mb-1 opacity-90">Total Points</h3>
                  <div className="text-4xl sm:text-5xl font-bold">{myParticipation.total_points || 0}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm opacity-90 mb-1">Points breakdown</div>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div>Daily: {myEntries?.reduce((sum, e) => sum + (e.points_earned || 0), 0) || 0}</div>
                    <div>Bonus: {myEntries?.reduce((sum, e) => sum + (e.bonus_points || 0), 0) || 0}</div>
                    {onetimeTasksTotal > 0 && (
                      <div>One-time: {onetimePoints}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* One-time Tasks Progress (only show if there are one-time tasks) */}
            {onetimeTasksTotal > 0 && (
              <div className="rounded-lg bg-card p-4 sm:p-6 shadow">
                <h3 className="text-base sm:text-lg font-semibold mb-4">One-time Tasks</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">
                      {onetimeTasksCompleted}/{onetimeTasksTotal}
                    </div>
                    <div className="text-sm text-muted-foreground">tasks completed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      +{onetimePoints}
                    </div>
                    <div className="text-sm text-muted-foreground">points earned</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${onetimeTasksTotal > 0 ? (onetimeTasksCompleted / onetimeTasksTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {onetimeTasksTotal > 0
                      ? Math.round((onetimeTasksCompleted / onetimeTasksTotal) * 100)
                      : 0}% complete
                  </div>
                </div>
              </div>
            )}

            {/* Streak Display */}
            <StreakDisplay
              currentStreak={myParticipation.current_streak || 0}
              longestStreak={myParticipation.longest_streak || 0}
              completedDays={myCompletedDays}
              startsAt={challenge.starts_at}
              endsAt={challenge.ends_at}
              durationDays={challenge.duration_days}
            />

            {/* Calendar View */}
            <ProgressCalendar
              entries={myEntries || []}
              periodicCompletions={myPeriodicCompletions || []}
              metrics={challenge.metrics || []}
              challengeStartDateISO={challenge.starts_at}
              challengeEndDateISO={challenge.ends_at}
            />

            {/* Additional Stats */}
            <ProgressTimelineCards
              startsAt={challenge.starts_at}
              endsAt={challenge.ends_at}
              durationDays={challenge.duration_days}
              completedDays={myCompletedDays}
              longestStreak={myParticipation.longest_streak || 0}
              status={myParticipation.status}
              onetimeTasksCompleted={onetimeTasksCompleted}
              onetimeTasksTotal={onetimeTasksTotal}
            />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-8">
            {/* Leaderboard */}
            <ParticipantsLeaderboard
              participants={participantsWithStats}
              currentUserId={user.id}
              challengeId={challenge.id}
              challengeName={challenge.name}
              challengeCreatorId={challenge.creator_id}
              challengeStartDateISO={challenge.starts_at}
              challengeEndDateISO={challenge.ends_at}
              challengeDurationDays={challenge.duration_days}
              challengeMetrics={challenge.metrics || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
