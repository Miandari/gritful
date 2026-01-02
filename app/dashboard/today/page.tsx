import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, XCircle, ArrowUpRight, Clock, Infinity } from 'lucide-react';
import { format } from 'date-fns';
import { getTodayDateString, parseLocalDate } from '@/lib/utils/dates';
import Link from 'next/link';
import DailyEntryForm from '@/components/daily-entry/DailyEntryForm';
import { getChallengeState, ChallengeStateResult } from '@/lib/utils/challengeState';
import { cn } from '@/lib/utils';

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
          const isCompleted = entry?.is_completed;
          const isLocked = entry?.is_locked;
          const challengeState = challenge.challengeState as ChallengeStateResult;
          const isGracePeriod = challengeState?.state === 'grace_period';
          const isOngoing = challenge.ends_at === null;
          // Use parseLocalDate to correctly handle the start date in local timezone
          const todayMidnight = new Date();
          todayMidnight.setHours(0, 0, 0, 0);
          const challengeStart = parseLocalDate(challenge.starts_at.split('T')[0]);
          const daysElapsed = Math.floor(
            (todayMidnight.getTime() - challengeStart.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return (
            <Card
              key={challenge.id}
              className={cn(
                isCompleted && 'border-green-500 border-2',
                isGracePeriod && !isCompleted && 'border-2 border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      <Link
                        href={`/challenges/${challenge.id}`}
                        className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors group w-fit underline-offset-4 hover:underline"
                      >
                        {challenge.name}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {isOngoing ? (
                        <span className="flex items-center gap-1">
                          <Infinity className="h-3 w-3" />
                          Day {daysElapsed + 1}
                        </span>
                      ) : (
                        `Day ${Math.min(daysElapsed + 1, challenge.duration_days)} of ${challenge.duration_days}`
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGracePeriod && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-600"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {challengeState.daysRemainingInGrace}d grace
                      </Badge>
                    )}
                    <Badge variant="secondary">{challenge.current_streak} day streak</Badge>
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-600 dark:bg-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                    {isLocked && (
                      <Badge variant="secondary">
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isCompleted && isLocked ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      You&apos;ve completed today&apos;s entry and it&apos;s now locked. Great job!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <DailyEntryForm
                    challenge={challenge}
                    participationId={challenge.participation_id}
                    existingEntry={entry}
                    isLocked={isLocked}
                    onetimeCompletions={onetimeCompletionsMap[challenge.participation_id] || []}
                    periodicCompletions={periodicCompletionsMap[challenge.participation_id] || []}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}