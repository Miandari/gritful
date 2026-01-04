import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import Link from 'next/link';
import { TodayChallengeCard } from '@/components/dashboard/TodayChallengeCard';
import { TodaySummary } from '@/components/dashboard/TodaySummary';
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
  // Explicitly select fields to ensure current_streak is included (avoid * caching issues)
  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select(`
      id,
      user_id,
      challenge_id,
      status,
      current_streak,
      longest_streak,
      total_points,
      challenges (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  const activeChallenges: any[] = [];
  // Fetch entries for past 3 days to handle timezone differences
  // Client will filter to find the correct "today" entry
  const recentEntriesMap: Record<string, any[]> = {};
  const onetimeCompletionsMap: Record<string, any[]> = {};
  const periodicCompletionsMap: Record<string, any[]> = {};
  // Use a 3-day window to cover all timezone scenarios (max UTC offset is ~14 hours)
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');

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

          // Get recent entries (past 3 days) to handle timezone differences
          // Client component will filter to find today's entry in user's local timezone
          const { data: entries } = await supabase
            .from('daily_entries')
            .select('*')
            .eq('participant_id', participation.id)
            .gte('entry_date', threeDaysAgo)
            .order('entry_date', { ascending: false });

          recentEntriesMap[participation.id] = entries || [];

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
        <TodaySummary activeChallenges={[]} recentEntriesMap={{}} />

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
      {/* Header and Summary - client component for correct timezone */}
      <TodaySummary
        activeChallenges={activeChallenges}
        recentEntriesMap={recentEntriesMap}
      />

      {/* Challenge entries */}
      <div className="space-y-6">
        {activeChallenges.map((challenge) => {
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
              recentEntries={recentEntriesMap[challenge.participation_id] || []}
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