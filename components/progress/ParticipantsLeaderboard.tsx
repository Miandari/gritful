'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Calendar } from 'lucide-react';
import { ParticipantDetailModal } from './ParticipantDetailModal';
import Link from 'next/link';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface Participant {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  profile: {
    username: string;
    avatar_url: string | null;
  };
  completedDays: number;
  totalDays: number;
  lastActivity: string | null;
  entries: any[];
}

interface ParticipantsLeaderboardProps {
  participants: Participant[];
  currentUserId: string;
  challengeId: string;
  challengeName: string;
  challengeCreatorId: string;
  challengeStartDateISO: string;  // Raw ISO timestamp from database
  challengeEndDateISO: string | null;  // Raw ISO timestamp from database
  challengeMetrics: any[];
}

export function ParticipantsLeaderboard({
  participants,
  currentUserId,
  challengeId,
  challengeName,
  challengeCreatorId,
  challengeStartDateISO,
  challengeEndDateISO,
  challengeMetrics
}: ParticipantsLeaderboardProps) {
  // Convert ISO timestamps to local dates ON THE CLIENT for correct user timezone
  const challengeStartDate = parseLocalDate(getLocalDateFromISO(challengeStartDateISO));
  const challengeEndDate = challengeEndDateISO
    ? parseLocalDate(getLocalDateFromISO(challengeEndDateISO))
    : new Date(2099, 11, 31);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Sort by total points, then by current streak
  const sortedParticipants = [...participants].sort((a, b) => {
    const pointsA = a.total_points || 0;
    const pointsB = b.total_points || 0;

    if (pointsB !== pointsA) {
      return pointsB - pointsA;
    }
    return b.current_streak - a.current_streak;
  });

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Trophy className="h-4 w-4 text-amber-600" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>See how everyone is doing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedParticipants.map((participant, index) => {
            const isCurrentUser = participant.user_id === currentUserId;
            const totalPoints = participant.total_points || 0;

            return (
              <div
                key={participant.id}
                onClick={() => setSelectedParticipant(participant)}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  isCurrentUser
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8">
                    {getRankBadge(index) || (
                      <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${participant.profile.username || 'unknown'}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline underline-offset-2 transition-colors"
                      >
                        {participant.profile.username || 'Unknown User'}
                      </Link>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{participant.current_streak} day streak</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {participant.completedDays}/{participant.totalDays} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPoints}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
                </div>
              </div>
            );
          })}

          {sortedParticipants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No participants yet
            </div>
          )}
        </div>
      </CardContent>

      {selectedParticipant && (
        <ParticipantDetailModal
          participant={selectedParticipant}
          currentUserId={currentUserId}
          challengeId={challengeId}
          challengeName={challengeName}
          challengeCreatorId={challengeCreatorId}
          challengeStartDate={challengeStartDate}
          challengeEndDate={challengeEndDate}
          challengeMetrics={challengeMetrics}
          isOpen={!!selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </Card>
  );
}
