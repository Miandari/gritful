import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressCalendar } from './ProgressCalendar';
import { TrendingUp, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

interface ParticipantEntry {
  entry_date: string;
  is_completed: boolean;
  points_earned?: number;
  bonus_points?: number;
  submitted_at?: string;
}

interface PeriodicCompletion {
  task_id: string;
  frequency: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  completed_at: string;
  value: any;
}

interface ChallengeMetric {
  id: string;
  name: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'onetime';
}

interface ParticipantProgressCardProps {
  participant: {
    id: string;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    profile: {
      username: string;
      avatar_url: string | null;
    };
  };
  entries: ParticipantEntry[];
  periodicCompletions?: PeriodicCompletion[];
  metrics?: ChallengeMetric[];
  challengeStartDateISO: string;  // Raw ISO timestamp from database
  challengeEndDateISO: string | null;  // Raw ISO timestamp from database
  isCurrentUser: boolean;
  completedDays: number;
  totalDays: number;
}

export function ParticipantProgressCard({
  participant,
  entries,
  periodicCompletions = [],
  metrics = [],
  challengeStartDateISO,
  challengeEndDateISO,
  isCurrentUser,
  completedDays,
  totalDays,
}: ParticipantProgressCardProps) {
  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link
                href={`/profile/${participant.profile.username || 'unknown'}`}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors"
              >
                {participant.profile.username || 'Unknown User'}
              </Link>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">
                  You
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{participant.current_streak} day streak</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>Best: {participant.longest_streak} days</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{completionRate}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {completedDays}/{totalDays} days
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProgressCalendar
          entries={entries}
          periodicCompletions={periodicCompletions}
          metrics={metrics}
          challengeStartDateISO={challengeStartDateISO}
          challengeEndDateISO={challengeEndDateISO}
        />
      </CardContent>
    </Card>
  );
}
