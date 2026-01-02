import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { getTodayDateString } from '@/lib/utils/dates';
import Link from 'next/link';
import { TodayChallengeCard } from '@/components/dashboard/TodayChallengeCard';
import { getChallengeState, ChallengeStateResult } from '@/lib/utils/challengeState';

export default async function TodayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's active participations with challenge details
  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select(`
      *,
      challenges (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  const activeChallenges: any[] = [];
  const todayEntries: any = {};
  const onetimeCompletionsMap: Record<string, any[]> = {};
  const periodicCompletionsMap: Record<string, any[]> = {};
  const todayDate = getTodayDateString();
  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (myParticipations) {
    for (const participation of myParticipations) {
      const challenge = participation.challenges;
      if (challenge) {
        // Use the challenge state utility to determine if entries are allowed
        const challengeState = getChallengeState(challenge);

        // Only show challenges where entry is allowed (active, grace_period, or ongoing)
        if (challengeState.isEntryAllowed) {
          activeChallenges.push({
            ...challenge,
            participation_id: participation.id,
            current_streak: participation.current_streak,
            longest_streak: participation.longest_streak,
            challengeState,
          });

          // Get today's entry if it exists
          const { data: entry } = await supabase
            .from('daily_entries')
            .select('*')
            .eq('participant_id', participation.id)
            .eq('entry_date', todayDate)
            .single();

          if (entry) {
            todayEntries[participation.id] = entry;
          }

          // Get one-time task completions
          const { data: onetimeCompletions } = await supabase
            .from('onetime_task_completions')
            .select('*')
            .eq('participant_id', participation.id);

          onetimeCompletionsMap[participation.id] = onetimeCompletions || [];

          // Get periodic task completions (weekly/monthly)
          const { data: periodicCompletions } = await supabase
            .from('periodic_task_completions')
            .select('*')
            .eq('participant_id', participation.id);

          periodicCompletionsMap[participation.id] = periodicCompletions || [];
        }
      }
    }
  }

  if (activeChallenges.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Today&apos;s Tasks</h1>
          <p className="mt-2 text-muted-foreground">{todayFormatted}</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any active challenges to track today.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild>
                <Link href="/challenges/browse">Browse Challenges</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/challenges/create">Create a Challenge</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Today&apos;s Tasks</h1>
        <p className="mt-2 text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Challenges</CardDescription>
            <CardTitle className="text-2xl">{activeChallenges.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed Today</CardDescription>
            <CardTitle className="text-2xl">
              {Object.keys(todayEntries).length}/{activeChallenges.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Streaks</CardDescription>
            <CardTitle className="text-2xl">
              {activeChallenges.reduce((sum, c) => sum + c.current_streak, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Challenge entries */}
      <div className="space-y-6">
        {activeChallenges.map((challenge) => {
          const entry = todayEntries[challenge.participation_id];
          const challengeState = challenge.challengeState as ChallengeStateResult;

          return (
            <TodayChallengeCard
              key={challenge.id}
              challenge={{
                id: challenge.id,
                name: challenge.name,
                starts_at: challenge.starts_at,
                ends_at: challenge.ends_at,
                duration_days: challenge.duration_days,
                participation_id: challenge.participation_id,
                current_streak: challenge.current_streak,
                metrics: challenge.metrics,
                enable_streak_bonus: challenge.enable_streak_bonus,
                streak_bonus_points: challenge.streak_bonus_points,
                enable_perfect_day_bonus: challenge.enable_perfect_day_bonus,
                perfect_day_bonus_points: challenge.perfect_day_bonus_points,
              }}
              entry={entry || null}
              challengeState={challengeState}
              onetimeCompletions={onetimeCompletionsMap[challenge.participation_id] || []}
              periodicCompletions={periodicCompletionsMap[challenge.participation_id] || []}
            />
          );
        })}
      </div>
    </div>
  );
}