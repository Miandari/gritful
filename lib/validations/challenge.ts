import { z } from 'zod';
import { parseLocalDate } from '@/lib/utils/dates';

// Metric validation schemas
export const metricConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  units: z.string().optional(),
  options: z.array(z.string()).optional(),
  acceptedTypes: z.array(z.string()).optional(),
  maxSizeMB: z.number().optional(),
  maxLength: z.number().optional(),
  parentMetricId: z.string().optional(),
  showWhenParentValue: z.any().optional(),
});

// Task frequency types
export const taskFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'onetime']);
export type TaskFrequency = z.infer<typeof taskFrequencySchema>;

export const metricSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Task name is required').max(100),
  type: z.enum(['boolean', 'number', 'duration', 'choice', 'file', 'text', 'combined']),
  required: z.boolean().default(true),
  order: z.number(),
  config: metricConfigSchema,
  // Scoring configuration
  points: z.number().min(0).default(1),
  scoring_mode: z.enum(['binary', 'scaled', 'tiered']).optional(),
  threshold: z.number().optional(),
  threshold_type: z.enum(['min', 'max']).default('min').optional(),
  tiers: z.array(z.object({
    threshold: z.number(),
    points: z.number(),
  })).optional(),
  // Frequency configuration: daily, weekly, monthly, onetime
  frequency: taskFrequencySchema.default('daily'),
  // For one-time tasks: optional deadline and creation timestamp
  deadline: z.string().optional(), // ISO date string
  created_at: z.string().optional(), // ISO timestamp for ordering one-time tasks
  // For mid-challenge recurring tasks: when the task stops being tracked
  ends_at: z.string().optional(), // ISO date string
});

// Challenge creation schema
export const challengeFormSchema = z.object({
  // Step 1: Basic Info
  name: z.string().min(3, 'Challenge name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  // Duration is nullable for ongoing challenges
  duration_days: z.number().min(1).max(365).nullable().default(30),
  // Flag to indicate this is an ongoing challenge (no end date)
  is_ongoing: z.boolean().default(false),
  starts_at: z.string().refine((date) => {
    // Use parseLocalDate for correct timezone handling
    const startDate = parseLocalDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate >= today;
  }, 'Start date cannot be in the past'),

  // Step 2: Metrics (will be handled separately)
  metrics: z.array(metricSchema).min(1, 'At least one metric is required'),

  // Step 3: Settings
  is_public: z.boolean().default(true),
  is_template: z.boolean().default(false),
  lock_entries_after_day: z.boolean().default(false),
  show_participant_details: z.boolean().default(true),
  failure_mode: z.enum(['strict', 'flexible', 'grace']).default('flexible'),
  // Bonus points configuration
  enable_streak_bonus: z.boolean().default(false),
  streak_bonus_points: z.number().min(0).default(5),
  enable_perfect_day_bonus: z.boolean().default(false),
  perfect_day_bonus_points: z.number().min(0).default(10),
  // Grace period: days after end date when entries are still allowed
  grace_period_days: z.number().min(0).max(14).default(7),
});

export type ChallengeFormData = z.infer<typeof challengeFormSchema>;
export type MetricFormData = z.infer<typeof metricSchema>;

// Helper to generate unique metric ID
export function generateMetricId() {
  return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// One-time task completion schema
export const onetimeTaskCompletionSchema = z.object({
  id: z.string(),
  participant_id: z.string(),
  task_id: z.string(),
  value: z.any(), // Flexible - depends on task type
  points_earned: z.number().default(0),
  completed_at: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type OnetimeTaskCompletion = z.infer<typeof onetimeTaskCompletionSchema>;

// Periodic (weekly/monthly) task completion schema
export const periodicTaskCompletionSchema = z.object({
  id: z.string(),
  participant_id: z.string(),
  task_id: z.string(),
  frequency: z.enum(['weekly', 'monthly']),
  period_start: z.string(), // YYYY-MM-DD
  period_end: z.string(),   // YYYY-MM-DD
  value: z.any(), // Flexible - depends on task type
  points_earned: z.number().default(0),
  completed_at: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PeriodicTaskCompletion = z.infer<typeof periodicTaskCompletionSchema>;

// Default metric templates
export const defaultMetricTemplates = {
  boolean: {
    name: '',
    type: 'boolean' as const,
    required: true,
    config: {},
    points: 1,
    frequency: 'daily' as const,
  },
  number: {
    name: '',
    type: 'number' as const,
    required: true,
    config: {
      min: 0,
      max: 100,
      units: '',
    },
    points: 1,
    scoring_mode: 'binary' as const,
    threshold: 0,
    threshold_type: 'min' as const,
    frequency: 'daily' as const,
  },
  duration: {
    name: '',
    type: 'duration' as const,
    required: true,
    config: {
      min: 0,
      max: 1440, // 24 hours in minutes
    },
    points: 1,
    scoring_mode: 'binary' as const,
    threshold: 0,
    threshold_type: 'min' as const,
    frequency: 'daily' as const,
  },
  choice: {
    name: '',
    type: 'choice' as const,
    required: true,
    config: {
      options: ['Option 1', 'Option 2'],
    },
    points: 1,
    frequency: 'daily' as const,
  },
  file: {
    name: '',
    type: 'file' as const,
    required: true,
    config: {
      acceptedTypes: ['image/*'],
      maxSizeMB: 10,
    },
    points: 1,
    frequency: 'daily' as const,
  },
  text: {
    name: '',
    type: 'text' as const,
    required: true,
    config: {
      maxLength: 500,
    },
    points: 1,
    frequency: 'daily' as const,
  },
};