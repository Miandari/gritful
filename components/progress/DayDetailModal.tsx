'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface DailyEntry {
  entry_date: string;
  is_completed: boolean;
  points_earned?: number;
  bonus_points?: number;
  submitted_at?: string;
  metric_data?: any;
  notes?: string;
}

interface DayDetailModalProps {
  date: Date;
  entry: DailyEntry | null;
  username: string;
  participantUserId: string;
  currentUserId: string;
  challengeId: string;
  challengeMetrics: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function DayDetailModal({
  date,
  entry,
  username,
  participantUserId,
  currentUserId,
  challengeId,
  challengeMetrics,
  isOpen,
  onClose
}: DayDetailModalProps) {
  const totalPoints = entry ? (entry.points_earned || 0) + (entry.bonus_points || 0) : 0;
  const isLate = entry?.submitted_at && entry?.entry_date
    ? (() => {
        const submittedDate = new Date(entry.submitted_at);
        const submittedDateStr = `${submittedDate.getFullYear()}-${String(submittedDate.getMonth() + 1).padStart(2, '0')}-${String(submittedDate.getDate()).padStart(2, '0')}`;
        return submittedDateStr > entry.entry_date;
      })()
    : false;

  // Create a map of metric ID to metric details
  const metricMap = new Map(
    challengeMetrics.map(metric => [metric.id, metric])
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {format(date, 'MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            {username}&apos;s activity for this day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Card */}
          <div className={`rounded-lg p-4 ${
            entry?.is_completed
              ? isLate
                ? 'bg-yellow-500/10 dark:bg-yellow-500/20 border-2 border-yellow-500'
                : 'bg-green-500/10 dark:bg-green-500/20 border-2 border-green-500'
              : 'bg-red-500/10 dark:bg-red-500/20 border-2 border-red-400'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {entry?.is_completed ? (
                  isLate ? (
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  )
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <div className="font-semibold text-lg">
                    {entry?.is_completed
                      ? isLate
                        ? 'Completed Late'
                        : 'Completed'
                      : 'Not Completed'
                    }
                  </div>
                  {entry?.submitted_at && (
                    <div className="text-sm text-muted-foreground">
                      Submitted: {format(new Date(entry.submitted_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </div>
              </div>
              {entry?.is_completed && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalPoints}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              )}
            </div>

            {entry?.is_completed && (entry.points_earned || entry.bonus_points) && (
              <div className="mt-3 pt-3 border-t border-border flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Base points: </span>
                  <span className="font-semibold">{entry.points_earned || 0}</span>
                </div>
                {entry.bonus_points ? (
                  <div>
                    <span className="text-muted-foreground">Bonus points: </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">+{entry.bonus_points}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Log This Day Button */}
          {participantUserId === currentUserId && !entry?.is_completed && (
            <div className="flex justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/challenges/${challengeId}/entries?date=${format(date, 'yyyy-MM-dd')}`}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Log This Day
                </Link>
              </Button>
            </div>
          )}

          {/* Task Data */}
          {entry?.metric_data && Object.keys(entry.metric_data).length > 0 && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tasks
              </h3>
              <div className="space-y-3">
                {Object.entries(entry.metric_data).map(([metricId, value]: [string, any]) => {
                  const metric = metricMap.get(metricId);
                  const metricName = metric?.name || metricId.replace(/_/g, ' ');

                  // Format the value based on metric type
                  let displayValue = value?.toString() || 'N/A';
                  if (metric?.type === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                  } else if (metric?.type === 'number') {
                    displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                  } else if (metric?.type === 'duration') {
                    // Duration is stored in minutes
                    const hours = Math.floor(value / 60);
                    const minutes = value % 60;
                    displayValue = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  } else if (metric?.type === 'choice') {
                    displayValue = Array.isArray(value) ? value.join(', ') : value;
                  } else if (typeof value === 'number') {
                    displayValue = value.toLocaleString();
                  }

                  return (
                    <div key={metricId} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-muted-foreground font-medium">
                        {metricName}
                      </span>
                      <span className="font-semibold text-foreground">
                        {displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {entry?.notes && (
            <div className="bg-card rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <p className="text-foreground whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* No Entry Message */}
          {!entry && (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-lg font-medium">No entry for this day</p>
              <p className="text-sm mt-1">This day was missed or not yet logged</p>
            </div>
          )}

          {/* Empty Entry */}
          {entry && !entry.is_completed && !entry.metric_data && !entry.notes && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No additional details available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
