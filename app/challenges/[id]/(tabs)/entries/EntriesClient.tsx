'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import DailyEntryForm from '@/components/daily-entry/DailyEntryForm';
import { DateSelector } from '@/components/challenges/DateSelector';
import { parseLocalDate, getLocalDateFromISO } from '@/lib/utils/dates';

interface OnetimeCompletion {
  task_id: string;
  completed_at: string;
  value: any;
}

interface PeriodicCompletion {
  task_id: string;
  frequency: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  completed_at: string;
  value: any;
}

interface EntriesClientProps {
  challenge: any;
  participantId: string;
  entries: any[];
  onetimeCompletions: OnetimeCompletion[];
  periodicCompletions: PeriodicCompletion[];
  challengeStartDateISO: string;  // Raw ISO timestamp from database
  challengeEndDateISO: string | null;  // Raw ISO timestamp from database
}

export default function EntriesClient({
  challenge,
  participantId,
  entries,
  onetimeCompletions,
  periodicCompletions,
  challengeStartDateISO,
  challengeEndDateISO,
}: EntriesClientProps) {
  // Convert ISO timestamps to local dates ON THE CLIENT for correct user timezone
  // This must happen on client because server (Vercel) runs in UTC
  const challengeStartDate = parseLocalDate(getLocalDateFromISO(challengeStartDateISO));
  const challengeEndDate = challengeEndDateISO
    ? parseLocalDate(getLocalDateFromISO(challengeEndDateISO))
    : new Date(2099, 11, 31); // Far future for ongoing challenges
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  // Validate URL date parameter: must be valid YYYY-MM-DD
  const isValidDateParam = (param: string | null): boolean => {
    if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return false;
    const [y, m, d] = param.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  };

  // Clamp initial selectedDate: yield to valid URL params, then clamp to challenge bounds
  const getInitialDate = (): string => {
    if (dateParam && isValidDateParam(dateParam)) return dateParam;
    const today = format(new Date(), 'yyyy-MM-dd');
    const startStr = getLocalDateFromISO(challengeStartDateISO);
    const endStr = challengeEndDateISO ? getLocalDateFromISO(challengeEndDateISO) : null;
    if (today < startStr) return startStr;
    if (endStr && today > endStr) return endStr;
    return today;
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(getInitialDate());

  const entryMap = new Map(entries.map(e => [e.entry_date, e]));
  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : null;

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  // Check if selected date is outside challenge bounds
  const isBeforeStart = selectedDate
    ? parseLocalDate(selectedDate) < challengeStartDate
    : false;
  const isAfterEnd = selectedDate && challengeEndDateISO
    ? parseLocalDate(selectedDate) > challengeEndDate
    : false;
  const isLate = selectedEntry?.submitted_at && selectedEntry?.is_completed && selectedEntry?.entry_date &&
    (() => {
      const submittedDate = new Date(selectedEntry.submitted_at);
      const submittedDateStr = `${submittedDate.getFullYear()}-${String(submittedDate.getMonth() + 1).padStart(2, '0')}-${String(submittedDate.getDate()).padStart(2, '0')}`;
      return submittedDateStr > selectedEntry.entry_date;
    })();

  return (
    <div className="grid md:grid-cols-[280px,1fr] gap-6">
      {/* Date Selector */}
      <div>
        <DateSelector
          challengeStartDate={challengeStartDate}
          challengeEndDate={challengeEndDate}
          entries={entries}
          periodicCompletions={periodicCompletions}
          metrics={challenge.metrics || []}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>

      {/* Entry Form */}
      <div>
        {selectedDate ? (
          isBeforeStart ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <p className="font-medium mb-1">Challenge had not started on this date</p>
                <p className="text-sm">Tracking begins on {format(challengeStartDate, 'MMMM d, yyyy')}</p>
              </CardContent>
            </Card>
          ) : isAfterEnd ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <p className="font-medium mb-1">Challenge had already ended on this date</p>
                <p className="text-sm">Challenge ended on {format(challengeEndDate, 'MMMM d, yyyy')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {format(parseLocalDate(selectedDate), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isToday && <Badge>Today</Badge>}
                    {selectedEntry?.is_completed ? (
                      <>
                        {isLate && (
                          <Badge variant="outline" className="bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                            <Clock className="mr-1 h-3 w-3" />
                            Late
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                        <span className="font-bold text-lg">
                          {(selectedEntry.points_earned || 0) + (selectedEntry.bonus_points || 0)} pts
                        </span>
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DailyEntryForm
                  challenge={challenge}
                  participationId={participantId}
                  existingEntry={selectedEntry || null}
                  targetDate={selectedDate}
                  onetimeCompletions={onetimeCompletions}
                  periodicCompletions={periodicCompletions}
                />
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Select a day from the list to view or edit your entry
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
