import { createClient } from '@/lib/supabase/server';
import type { Achievement, ParticipantStats, EarnedAchievement } from './types';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

/**
 * Check and award achievements for a participant after an action (e.g., entry submission)
 * Returns newly earned achievements for popup display
 */
export async function checkAndAwardAchievements(
  participantId: string,
  challengeId: string
): Promise<EarnedAchievement[]> {
  const supabase = await createClient();

  // 1. Get participant stats
  const stats = await getParticipantStats(participantId);

  // 2. Get all achievements for this challenge (defaults + custom)
  const { data: achievements } = await supabase
    .rpc('get_challenge_achievements', { p_challenge_id: challengeId });

  if (!achievements || achievements.length === 0) {
    return [];
  }

  // 3. Get already earned achievement IDs
  const { data: earnedRecords } = await supabase
    .from('participant_achievements')
    .select('achievement_id')
    .eq('participant_id', participantId);

  const earnedIds = new Set((earnedRecords || []).map(e => e.achievement_id));

  // 4. Check each unearned achievement
  const newlyEarned: EarnedAchievement[] = [];

  for (const achievement of achievements as Achievement[]) {
    if (earnedIds.has(achievement.id)) continue;

    if (meetsRequirement(achievement, stats)) {
      // Award the achievement
      const { error } = await supabase
        .from('participant_achievements')
        .insert({
          participant_id: participantId,
          achievement_id: achievement.id,
        });

      if (!error) {
        newlyEarned.push({
          achievement_id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          earned_at: new Date().toISOString(),
        });

        // Post to activity feed
        await postAchievementToFeed(participantId, challengeId, achievement);
      }
    }
  }

  return newlyEarned;
}

/**
 * Get participant stats for achievement checking
 */
async function getParticipantStats(participantId: string): Promise<ParticipantStats> {
  const supabase = await createClient();

  // Get participant data
  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('current_streak, longest_streak, total_points, challenge_id, status')
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
  const perfectDays = entries?.filter(e => e.is_completed && (e.bonus_points || 0) > 0).length || 0;

  // Count early entries (submitted before 9am)
  const earlyEntries = entries?.filter(e => {
    if (!e.submitted_at) return false;
    const hour = new Date(e.submitted_at).getHours();
    return hour < 9;
  }).length || 0;

  // Count late entries (submitted after 9pm)
  const lateEntries = entries?.filter(e => {
    if (!e.submitted_at) return false;
    const hour = new Date(e.submitted_at).getHours();
    return hour >= 21;
  }).length || 0;

  // Calculate completion rate
  const { data: challenge } = await supabase
    .from('challenges')
    .select('starts_at, ends_at, duration_days')
    .eq('id', participant.challenge_id)
    .single();

  let completionRate = 0;
  if (challenge && entries) {
    // Use parseLocalDate to correctly handle dates in local timezone
    const startDate = parseLocalDate(getLocalDateFromISO(challenge.starts_at));
    const endDate = challenge.ends_at ? parseLocalDate(getLocalDateFromISO(challenge.ends_at)) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = endDate && endDate < today ? endDate : today;

    const totalDays = Math.max(1, Math.floor(
      (effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);

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

/**
 * Check if participant meets requirement for an achievement
 */
function meetsRequirement(achievement: Achievement, stats: ParticipantStats): boolean {
  const { trigger_type, trigger_value } = achievement;

  switch (trigger_type) {
    case 'streak_days':
      // Check both current and longest streak
      return stats.currentStreak >= trigger_value || stats.longestStreak >= trigger_value;

    case 'total_points':
      return stats.totalPoints >= trigger_value;

    case 'entries_logged':
      return stats.entriesCount >= trigger_value;

    case 'perfect_days':
      return stats.perfectDays >= trigger_value;

    case 'completion_rate':
      return stats.completionRate >= trigger_value;

    case 'challenge_complete':
      return stats.challengeComplete;

    case 'early_entries':
      return stats.earlyEntries >= trigger_value;

    case 'late_entries':
      return stats.lateEntries >= trigger_value;

    default:
      return false;
  }
}

/**
 * Post achievement earned to activity feed
 */
async function postAchievementToFeed(
  participantId: string,
  challengeId: string,
  achievement: Achievement
): Promise<void> {
  const supabase = await createClient();

  // Get user_id from participant
  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('user_id')
    .eq('id', participantId)
    .single();

  if (!participant) return;

  await supabase
    .from('challenge_activity_feed')
    .insert({
      challenge_id: challengeId,
      user_id: participant.user_id,
      activity_type: 'achievement_earned',
      message: `earned the "${achievement.name}" achievement!`,
      metadata: {
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        achievement_icon: achievement.icon,
        achievement_category: achievement.category,
      },
    });
}

/**
 * Calculate progress toward an achievement
 */
export function calculateProgress(
  achievement: Achievement,
  stats: ParticipantStats
): { current: number; target: number } {
  const target = achievement.trigger_value;

  switch (achievement.trigger_type) {
    case 'streak_days':
      return { current: Math.max(stats.currentStreak, stats.longestStreak), target };

    case 'total_points':
      return { current: stats.totalPoints, target };

    case 'entries_logged':
      return { current: stats.entriesCount, target };

    case 'perfect_days':
      return { current: stats.perfectDays, target };

    case 'completion_rate':
      return { current: stats.completionRate, target };

    case 'early_entries':
      return { current: stats.earlyEntries, target };

    case 'late_entries':
      return { current: stats.lateEntries, target };

    case 'challenge_complete':
      return { current: stats.challengeComplete ? 1 : 0, target: 1 };

    default:
      return { current: 0, target };
  }
}
