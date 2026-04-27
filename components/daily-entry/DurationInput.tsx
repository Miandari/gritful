'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface DurationInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  compact?: boolean;
  pointsBadge?: React.ReactNode;
}

const QUICK_INCREMENTS = [
  { label: '+10m', minutes: 10 },
  { label: '+30m', minutes: 30 },
  { label: '+1h', minutes: 60 },
];

export function DurationInput({ value, onChange, disabled, compact, pointsBadge }: DurationInputProps) {
  const hours = value ? Math.floor(value / 60) : '';
  const minutes = value ? value % 60 : '';

  const updateHours = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const h = val === '' ? 0 : parseInt(val);
    const currentMinutes = (value || 0) % 60;
    const total = h * 60 + currentMinutes;
    onChange(total === 0 ? undefined : total);
  };

  const updateMinutes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const m = val === '' ? 0 : parseInt(val);
    const currentHours = Math.floor((value || 0) / 60);
    const total = currentHours * 60 + m;
    onChange(total === 0 ? undefined : total);
  };

  const addMinutes = (mins: number) => {
    const current = value || 0;
    onChange(current + mins);
  };

  const reset = () => {
    onChange(undefined);
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={updateHours}
              placeholder="0"
              disabled={disabled}
              className="w-14 text-right"
            />
            <span className="text-xs text-muted-foreground">h</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={updateMinutes}
              placeholder="0"
              disabled={disabled}
              className="w-14 text-right"
            />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          {pointsBadge}
        </div>
        <div className="flex items-center gap-1.5">
          {QUICK_INCREMENTS.map((inc) => (
            <Button
              key={inc.label}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => addMinutes(inc.minutes)}
              className="h-8 px-3 text-xs font-medium"
            >
              {inc.label}
            </Button>
          ))}
          {(value !== undefined && value > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={reset}
              className="h-8 w-8 p-0 shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={updateHours}
            placeholder="0"
            disabled={disabled}
            className="h-11 text-base"
          />
          <span className="text-xs text-muted-foreground ml-1">hours</span>
        </div>
        <div className="flex-1">
          <Input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={updateMinutes}
            placeholder="0"
            disabled={disabled}
            className="h-11 text-base"
          />
          <span className="text-xs text-muted-foreground ml-1">minutes</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {QUICK_INCREMENTS.map((inc) => (
          <Button
            key={inc.label}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => addMinutes(inc.minutes)}
            className="h-11 flex-1 text-base font-medium"
          >
            {inc.label}
          </Button>
        ))}
        {(value !== undefined && value > 0) && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={reset}
            className="h-11 w-11 p-0 shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Total: {Math.floor((value || 0) / 60)}h {(value || 0) % 60}m
      </p>
    </div>
  );
}
