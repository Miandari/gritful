'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { recalculateAllPoints } from '@/app/actions/recalculatePoints';
import { updateChallengeSettings } from '@/app/actions/updateChallenge';
import { MetricFormData } from '@/lib/validations/challenge';

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

  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [recalculateMessage, setRecalculateMessage] = useState('');
  const [error, setError] = useState('');

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
      const result = await updateChallengeSettings({
        challengeId: challenge.id,
        metrics,
        enable_streak_bonus: enableStreakBonus,
        streak_bonus_points: streakBonusPoints,
        enable_perfect_day_bonus: enablePerfectDayBonus,
        perfect_day_bonus_points: perfectDayBonusPoints,
      });

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
