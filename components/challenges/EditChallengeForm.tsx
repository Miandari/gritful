'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar } from 'lucide-react';
import { recalculateAllPoints } from '@/app/actions/recalculatePoints';
import { updateChallengeSettings } from '@/app/actions/updateChallenge';
import { MetricFormData } from '@/lib/validations/challenge';
import { getChallengeState } from '@/lib/utils/challengeState';
import { parseLocalDate } from '@/lib/utils/dates';

interface EditChallengeFormProps {
  challenge: any;
}

export default function EditChallengeForm({ challenge }: EditChallengeFormProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricFormData[]>(challenge.metrics || []);
  const [enableStreakBonus, setEnableStreakBonus] = useState(challenge.enable_streak_bonus || false);
  const [streakBonusPoints, setStreakBonusPoints] = useState(challenge.streak_bonus_points || 5);
  const [enablePerfectDayBonus, setEnablePerfectDayBonus] = useState(challenge.enable_perfect_day_bonus || false);
  const [perfectDayBonusPoints, setPerfectDayBonusPoints] = useState(challenge.perfect_day_bonus_points || 10);
  const [gracePeriodDays, setGracePeriodDays] = useState(challenge.grace_period_days ?? 7);

  // Duration state
  const [isOngoing, setIsOngoing] = useState(challenge.ends_at === null);
  const [endsAt, setEndsAt] = useState(challenge.ends_at || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [recalculateMessage, setRecalculateMessage] = useState('');
  const [error, setError] = useState('');

  // Determine if duration can be modified
  const challengeState = useMemo(() => {
    return getChallengeState({
      starts_at: challenge.starts_at,
      ends_at: challenge.ends_at,
      grace_period_days: challenge.grace_period_days,
      ended_at: challenge.ended_at,
    });
  }, [challenge.starts_at, challenge.ends_at, challenge.grace_period_days, challenge.ended_at]);

  const canModifyDuration = challengeState.state === 'active' || challengeState.state === 'ongoing' || challengeState.state === 'upcoming';

  // Calculate duration in days (use parseLocalDate for correct timezone handling)
  const calculatedDuration = useMemo(() => {
    if (isOngoing || !endsAt) return null;
    const start = parseLocalDate(challenge.starts_at.split('T')[0]);
    const end = parseLocalDate(endsAt.split('T')[0]);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }, [challenge.starts_at, endsAt, isOngoing]);

  // Get today's date for min value
  const today = new Date().toISOString().split('T')[0];

  const totalPossiblePoints = metrics.reduce((sum, m) => sum + (m.points || 1), 0);

  const updateMetricPoints = (index: number, points: number) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], points };
    setMetrics(updated);
  };

  const updateMetricThreshold = (index: number, threshold: number) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], threshold, scoring_mode: 'binary' };
    setMetrics(updated);
  };

  const updateMetricThresholdType = (index: number, thresholdType: 'min' | 'max') => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], threshold_type: thresholdType };
    setMetrics(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaveMessage('');

    try {
      // Build update data
      const updateData: {
        challengeId: string;
        metrics: MetricFormData[];
        enable_streak_bonus: boolean;
        streak_bonus_points: number;
        enable_perfect_day_bonus: boolean;
        perfect_day_bonus_points: number;
        grace_period_days: number;
        ends_at?: string | null;
      } = {
        challengeId: challenge.id,
        metrics,
        enable_streak_bonus: enableStreakBonus,
        streak_bonus_points: streakBonusPoints,
        enable_perfect_day_bonus: enablePerfectDayBonus,
        perfect_day_bonus_points: perfectDayBonusPoints,
        grace_period_days: gracePeriodDays,
      };

      // Include ends_at only if duration can be modified and value changed
      if (canModifyDuration) {
        const originalIsOngoing = challenge.ends_at === null;
        const originalEndsAt = challenge.ends_at || '';

        if (isOngoing !== originalIsOngoing || endsAt !== originalEndsAt) {
          updateData.ends_at = isOngoing ? null : endsAt;
        }
      }

      const result = await updateChallengeSettings(updateData);

      if (result.success) {
        setSaveMessage('Settings saved successfully!');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setError('');
    setRecalculateMessage('');

    try {
      const result = await recalculateAllPoints(challenge.id);

      if (result.success) {
        setRecalculateMessage(
          `Successfully recalculated ${result.recalculated} entries!`
        );
        router.refresh();
      } else {
        setError(result.error || 'Failed to recalculate points');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Challenge Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Challenge Duration
          </CardTitle>
          <CardDescription>
            {canModifyDuration
              ? 'Modify the end date or convert between timed and ongoing'
              : 'This challenge has ended and duration cannot be modified'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Start date (read-only) */}
            <div>
              <Label className="text-muted-foreground">Start Date</Label>
              <p className="font-medium">
                {new Date(challenge.starts_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {canModifyDuration ? (
              <>
                {/* Ongoing toggle */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="is_ongoing"
                    checked={isOngoing}
                    onChange={(e) => {
                      setIsOngoing(e.target.checked);
                      if (e.target.checked) {
                        setEndsAt('');
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="is_ongoing" className="font-medium cursor-pointer">
                      Ongoing challenge (no end date)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      The challenge will continue indefinitely until you manually end it
                    </p>
                  </div>
                </div>

                {/* End date picker (only shown when not ongoing) */}
                {!isOngoing && (
                  <div className="space-y-2">
                    <Label htmlFor="ends_at">End Date</Label>
                    <Input
                      id="ends_at"
                      type="date"
                      value={endsAt}
                      min={today}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="max-w-[200px]"
                    />
                    {calculatedDuration !== null && calculatedDuration > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {calculatedDuration} day{calculatedDuration !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Read-only display for ended challenges */}
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {challenge.ends_at
                      ? new Date(challenge.ends_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'No end date (was ongoing)'}
                  </p>
                </div>
                <Alert>
                  <AlertDescription>
                    {challengeState.state === 'grace_period'
                      ? 'This challenge is in its grace period. Duration cannot be modified after the challenge has ended.'
                      : 'This challenge has ended. Duration cannot be modified.'}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tasks Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks & Points</CardTitle>
          <CardDescription>
            Configure points and thresholds for each task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div
                key={metric.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-gray-500">Type: {metric.type}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`points-${index}`}>Points</Label>
                    <Input
                      id={`points-${index}`}
                      type="number"
                      min="0"
                      value={metric.points || 1}
                      onChange={(e) => updateMetricPoints(index, Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  {(metric.type === 'number' || metric.type === 'duration') && (
                    <>
                      <div>
                        <Label htmlFor={`threshold-type-${index}`}>
                          Threshold Type
                        </Label>
                        <Select
                          value={metric.threshold_type || 'min'}
                          onValueChange={(value) => updateMetricThresholdType(index, value as 'min' | 'max')}
                        >
                          <SelectTrigger id={`threshold-type-${index}`} className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="min">Minimum (at least)</SelectItem>
                            <SelectItem value="max">Maximum (at most)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`threshold-${index}`}>
                          {metric.threshold_type === 'max' ? 'Maximum' : 'Minimum'} for Full Points
                        </Label>
                        <Input
                          id={`threshold-${index}`}
                          type="number"
                          min="0"
                          value={metric.threshold || 0}
                          onChange={(e) => updateMetricThreshold(index, Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium">Total Possible Points per Day:</span>
              <span className="text-xl font-bold text-blue-600">
                {totalPossiblePoints} pts
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grace Period Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Grace Period</CardTitle>
          <CardDescription>
            Allow entry logging after the challenge officially ends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="grace_period_days">Days after end date</Label>
            <Input
              id="grace_period_days"
              type="number"
              min={0}
              max={14}
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              className="max-w-[120px]"
            />
            <p className="text-sm text-muted-foreground">
              Participants can still log entries during this period. Set to 0 to disable.
              Challenges in grace period display an amber border. (Range: 0-14 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Points Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Bonus Points</CardTitle>
          <CardDescription>Configure bonus rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="enable_streak_bonus"
                checked={enableStreakBonus}
                onChange={(e) => setEnableStreakBonus(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="enable_streak_bonus" className="font-medium cursor-pointer">
                  Enable streak bonus
                </Label>
                <p className="text-sm text-gray-600">
                  Award extra points based on current streak
                </p>
                {enableStreakBonus && (
                  <div className="mt-2">
                    <Label htmlFor="streak_bonus_points" className="text-xs">
                      Points per streak day
                    </Label>
                    <Input
                      id="streak_bonus_points"
                      type="number"
                      min="0"
                      value={streakBonusPoints}
                      onChange={(e) => setStreakBonusPoints(Number(e.target.value))}
                      className="mt-1 max-w-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="enable_perfect_day_bonus"
                checked={enablePerfectDayBonus}
                onChange={(e) => setEnablePerfectDayBonus(e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="enable_perfect_day_bonus" className="font-medium cursor-pointer">
                  Enable perfect day bonus
                </Label>
                <p className="text-sm text-gray-600">
                  Award bonus points for completing all required tasks
                </p>
                {enablePerfectDayBonus && (
                  <div className="mt-2">
                    <Label htmlFor="perfect_day_bonus_points" className="text-xs">
                      Bonus points
                    </Label>
                    <Input
                      id="perfect_day_bonus_points"
                      type="number"
                      min="0"
                      value={perfectDayBonusPoints}
                      onChange={(e) => setPerfectDayBonusPoints(Number(e.target.value))}
                      className="mt-1 max-w-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Save Changes</CardTitle>
          <CardDescription>
            Save your scoring configuration changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {saveMessage && (
              <Alert>
                <AlertDescription>{saveMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recalculate Points */}
      <Card>
        <CardHeader>
          <CardTitle>Recalculate All Points</CardTitle>
          <CardDescription>
            Recalculate points for all existing entries based on the current scoring
            configuration. Make sure to save your changes first!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recalculateMessage && (
              <Alert>
                <AlertDescription>{recalculateMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              variant="secondary"
              className="w-full"
            >
              {isRecalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRecalculating ? 'Recalculating...' : 'Recalculate All Points'}
            </Button>

            <p className="text-xs text-gray-500">
              Note: This operation may take a few moments if there are many entries.
              All participants' scores will be updated based on their entry data.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/challenges/${challenge.id}`)}
        >
          Back to Challenge
        </Button>
      </div>
    </div>
  );
}
