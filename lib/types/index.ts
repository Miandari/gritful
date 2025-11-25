// Database types
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export type MetricType =
  | 'boolean'
  | 'number'
  | 'duration'
  | 'choice'
  | 'file'
  | 'text'
  | 'combined';

export type FailureMode = 'strict' | 'flexible' | 'grace';

export interface MetricConfig {
  // For number
  min?: number;
  max?: number;
  units?: string;

  // For choice
  options?: string[];

  // For file
  acceptedTypes?: string[];
  maxSizeMB?: number;

  // For text
  maxLength?: number;

  // For combined
  parentMetricId?: string;
  showWhenParentValue?: any;
}

export interface Metric {
  id: string;
  name: string;
  type: MetricType;
  required: boolean;
  order: number;
  config: MetricConfig;
}

export interface Challenge {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  duration_days: number | null; // null for ongoing challenges
  is_public: boolean;
  is_template: boolean;
  invite_code: string | null;
  lock_entries_after_day: boolean;
  failure_mode: FailureMode;
  metrics: Metric[];
  creator_settings: Record<string, any>;
  created_at: string;
  starts_at: string;
  ends_at: string | null; // null for ongoing challenges
  ended_at?: string | null; // when creator manually ended an ongoing challenge
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  status: 'active' | 'completed' | 'abandoned';
  current_streak: number;
  longest_streak: number;
  missed_days: number;
}

export interface DailyEntry {
  id: string;
  participant_id: string;
  day_number: number;
  values: Record<string, any>;
  is_locked: boolean;
  submitted_at: string;
}

export interface UserStorageUsage {
  user_id: string;
  bytes_used: number;
  bytes_limit: number;
  updated_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_reminders: boolean;
  reminder_time: string;
  timezone: string;
}

// Frontend-specific types
export interface ChallengeWithCreator extends Challenge {
  creator: Profile;
  participant_count?: number;
}

export interface ParticipantWithProfile extends ChallengeParticipant {
  profile: Profile;
}

export interface DailyEntryFormData {
  [metricId: string]: any;
}
