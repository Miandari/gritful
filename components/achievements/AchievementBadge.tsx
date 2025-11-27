'use client';

import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import type { AchievementCategory } from '@/lib/achievements/types';
import { CATEGORY_COLORS } from '@/lib/achievements/types';

interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  earned: boolean;
  progress?: { current: number; target: number };
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  sm: {
    container: 'w-12 h-12',
    icon: 'text-xl',
    name: 'text-[10px]',
    progress: 'text-[8px]',
  },
  md: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    name: 'text-xs',
    progress: 'text-[10px]',
  },
  lg: {
    container: 'w-20 h-20',
    icon: 'text-3xl',
    name: 'text-sm',
    progress: 'text-xs',
  },
};

export function AchievementBadge({
  name,
  description,
  icon,
  category,
  earned,
  progress,
  size = 'md',
  showName = true,
  onClick,
}: AchievementBadgeProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const colors = CATEGORY_COLORS[category];

  const isInProgress = !earned && progress && progress.current > 0;
  const progressPercent = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1',
        onClick && 'cursor-pointer hover:scale-105 transition-transform'
      )}
      onClick={onClick}
      title={description}
    >
      {/* Badge Circle */}
      <div
        className={cn(
          sizeClasses.container,
          'relative rounded-full flex items-center justify-center border-2 transition-all',
          earned && [colors.bg, colors.border, 'shadow-lg'],
          !earned && !isInProgress && 'bg-muted border-muted-foreground/20',
          isInProgress && ['bg-muted', colors.border]
        )}
      >
        {/* Progress ring for in-progress achievements */}
        {isInProgress && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className={cn(colors.text, 'opacity-30')}
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 2.89} 289`}
              className={colors.text}
            />
          </svg>
        )}

        {/* Icon or Lock */}
        {earned || isInProgress ? (
          <span
            className={cn(
              sizeClasses.icon,
              earned ? 'drop-shadow-md' : 'opacity-50'
            )}
          >
            {icon}
          </span>
        ) : (
          <Lock
            className={cn(
              'text-muted-foreground/40',
              size === 'sm' && 'h-4 w-4',
              size === 'md' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6'
            )}
          />
        )}

        {/* Earned checkmark */}
        {earned && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5 border-2 border-background">
            <svg
              className={cn(
                'text-white',
                size === 'sm' && 'h-2 w-2',
                size === 'md' && 'h-2.5 w-2.5',
                size === 'lg' && 'h-3 w-3'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Name and Progress */}
      {showName && (
        <div className="text-center max-w-[80px]">
          <p
            className={cn(
              sizeClasses.name,
              'font-medium leading-tight line-clamp-2',
              earned ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {name}
          </p>
          {isInProgress && progress && (
            <p className={cn(sizeClasses.progress, 'text-muted-foreground mt-0.5')}>
              {progress.current}/{progress.target}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
