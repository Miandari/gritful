import type { Achievement, ParticipantStats } from './types';

/**
 * Calculate progress toward an achievement
 * This is a pure function safe for use in both server and client components
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
