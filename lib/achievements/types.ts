// Achievement System Types

export type AchievementCategory = 'streak' | 'points' | 'completion' | 'consistency' | 'custom';

export type AchievementTriggerType =
  | 'streak_days'
  | 'total_points'
  | 'entries_logged'
  | 'perfect_days'
  | 'completion_rate'
  | 'challenge_complete'
  | 'early_entries'
  | 'late_entries';

export interface Achievement {
  id: string;
  challenge_id: string | null;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  trigger_type: AchievementTriggerType;
  trigger_value: number;
  is_hidden: boolean;
  display_order: number;
  created_at: string;
}

export interface EarnedAchievement {
  achievement_id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  earned_at: string;
  challenge_name?: string;
}

export interface ParticipantAchievement {
  id: string;
  participant_id: string;
  achievement_id: string;
  earned_at: string;
  notified: boolean;
}

export interface ParticipantStats {
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  entriesCount: number;
  perfectDays: number;
  completionRate: number;
  earlyEntries: number;
  lateEntries: number;
  challengeComplete: boolean;
}

export interface AchievementWithProgress extends Achievement {
  earned: boolean;
  earned_at?: string;
  progress?: {
    current: number;
    target: number;
  };
}

// Category colors for UI
export const CATEGORY_COLORS: Record<AchievementCategory, { bg: string; border: string; text: string }> = {
  streak: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-500' },
  points: { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-500' },
  completion: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-500' },
  consistency: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-500' },
  custom: { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-500' },
};

// Available icons for custom achievements
export const ACHIEVEMENT_ICONS = [
  '🏅', '🎖️', '🥇', '🥈', '🥉', '⭐', '🌟', '✨',
  '💪', '🎯', '🚀', '🔥', '💎', '👑', '🏆', '🎉',
  '💯', '⚡', '🌈', '🎪', '🎨', '📚', '💡', '🔮',
];
