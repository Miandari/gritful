import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AchievementGrid } from '@/components/achievements/AchievementGrid';
import { calculateProgress } from '@/lib/achievements/checkAchievements';
import type { Achievement, AchievementWithProgress, ParticipantStats } from '@/lib/achievements/types';
import { parseLocalDate } from '@/lib/utils/dates';

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

  // Get all achievements for this challenge
  const { data: achievements } = await supabase.rpc('get_challenge_achievements', {
    p_challenge_id: challengeId,
  });

  // Get participant's earned achievements
  const { data: earnedRecords } = await supabase
    .from('participant_achievements')
    .select('achievement_id, earned_at')
    .eq('participant_id', participant.id);

  const earnedMap = new Map(
    (earnedRecords || []).map(e => [e.achievement_id, e.earned_at])
  );

  // Get participant stats for progress calculation
  const stats = await getParticipantStats(supabase, participant.id, challengeId);

  // Build achievements with progress
  const achievementsWithProgress: AchievementWithProgress[] = (achievements || []).map(
    (achievement: Achievement) => {
      const earned = earnedMap.has(achievement.id);
      const earned_at = earnedMap.get(achievement.id);
      const progress = !earned ? calculateProgress(achievement, stats) : undefined;

      return {
        ...achievement,
        earned,
        earned_at,
        progress,
      };
    }
  );

  // Sort by display_order
  achievementsWithProgress.sort((a, b) => a.display_order - b.display_order);

  const earnedCount = achievementsWithProgress.filter(a => a.earned).length;
  const totalCount = achievementsWithProgress.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Achievements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {earnedCount} of {totalCount} earned
          </p>
        </div>
      </div>

      {/* Achievement Grid */}
      <AchievementGrid
        achievements={achievementsWithProgress}
        showProgress={true}
        size="md"
      />
    </div>
  );
}

// Helper function to get participant stats (duplicated from checkAchievements for server component)
async function getParticipantStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participantId: string,
  challengeId: string
): Promise<ParticipantStats> {
  // Get participant data
  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('current_streak, longest_streak, total_points, status')
    .eq('id', participantId)
    .single();

  if (!participant) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      entriesCount: 0,
      perfectDays: 0,
      completionRate: 0,
      earlyEntries: 0,
      lateEntries: 0,
      challengeComplete: false,
    };
  }

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

  // Calculate completion rate
  const { data: challenge } = await supabase
    .from('challenges')
    .select('starts_at, ends_at, duration_days')
    .eq('id', challengeId)
    .single();

  let completionRate = 0;
  if (challenge && entries) {
    // Use parseLocalDate to correctly handle dates in local timezone
    const startDate = parseLocalDate(challenge.starts_at.split('T')[0]);
    const endDate = challenge.ends_at ? parseLocalDate(challenge.ends_at.split('T')[0]) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = endDate && endDate < today ? endDate : today;

    const totalDays = Math.max(
      1,
      Math.floor((effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const completedDays = entries.filter(e => e.is_completed).length;
    completionRate = Math.round((completedDays / totalDays) * 100);
  }

  return {
    currentStreak: participant.current_streak || 0,
    longestStreak: participant.longest_streak || 0,
    totalPoints: participant.total_points || 0,
    entriesCount,
    perfectDays,
    completionRate,
    earlyEntries,
    lateEntries,
    challengeComplete: participant.status === 'completed',
  };
}
