import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AchievementsContent } from '@/components/achievements/AchievementsContent';
import type { Achievement, ParticipantStats } from '@/lib/achievements/types';

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: challengeId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get participant data
  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('id, current_streak, longest_streak, total_points, status')
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .single();

  if (!participant) {
    redirect(`/challenges/${challengeId}`);
  }

  // Get challenge data for timezone-safe date handling on client
  const { data: challenge } = await supabase
    .from('challenges')
    .select('starts_at, ends_at, duration_days')
    .eq('id', challengeId)
    .single();

  if (!challenge) {
    redirect(`/challenges/${challengeId}`);
  }

  // Get all achievements for this challenge
  const { data: achievements } = await supabase.rpc('get_challenge_achievements', {
    p_challenge_id: challengeId,
  });

  // Get participant's earned achievements
  const { data: earnedRecords } = await supabase
    .from('participant_achievements')
    .select('achievement_id, earned_at')
    .eq('participant_id', participant.id);

  // Convert to Record for serialization
  const earnedMap: Record<string, string> = {};
  (earnedRecords || []).forEach(e => {
    earnedMap[e.achievement_id] = e.earned_at;
  });

  // Get participant stats (excluding completionRate which will be calculated on client)
  const baseStats = await getBaseParticipantStats(supabase, participant.id, participant);

  // Get entry stats for completion rate calculation on client
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('is_completed')
    .eq('participant_id', participant.id);

  const completedEntriesCount = entries?.filter(e => e.is_completed).length || 0;

  return (
    <AchievementsContent
      achievements={achievements || []}
      earnedMap={earnedMap}
      baseStats={baseStats}
      completedEntriesCount={completedEntriesCount}
      startsAt={challenge.starts_at}
      endsAt={challenge.ends_at}
      durationDays={challenge.duration_days}
    />
  );
}

// Helper function to get participant stats (excluding completionRate)
async function getBaseParticipantStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participantId: string,
  participant: { current_streak: number | null; longest_streak: number | null; total_points: number | null; status: string }
): Promise<Omit<ParticipantStats, 'completionRate'>> {
  // Get entry stats
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('is_completed, submitted_at, entry_date, bonus_points')
    .eq('participant_id', participantId);

  const entriesCount = entries?.length || 0;

  // Count perfect days (entries with bonus_points > 0 typically indicate perfect days)
  const perfectDays =
    entries?.filter(e => e.is_completed && (e.bonus_points || 0) > 0).length || 0;

  // Count early entries (submitted before 9am)
  const earlyEntries =
    entries?.filter(e => {
      if (!e.submitted_at) return false;
      const hour = new Date(e.submitted_at).getHours();
      return hour < 9;
    }).length || 0;

  // Count late entries (submitted after 9pm)
  const lateEntries =
    entries?.filter(e => {
      if (!e.submitted_at) return false;
      const hour = new Date(e.submitted_at).getHours();
      return hour >= 21;
    }).length || 0;

  return {
    currentStreak: participant.current_streak || 0,
    longestStreak: participant.longest_streak || 0,
    totalPoints: participant.total_points || 0,
    entriesCount,
    perfectDays,
    earlyEntries,
    lateEntries,
    challengeComplete: participant.status === 'completed',
  };
}
