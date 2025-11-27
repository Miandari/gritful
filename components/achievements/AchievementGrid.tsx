'use client';

import { AchievementBadge } from './AchievementBadge';
import type { AchievementWithProgress, AchievementCategory } from '@/lib/achievements/types';

interface AchievementGridProps {
  achievements: AchievementWithProgress[];
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onAchievementClick?: (achievement: AchievementWithProgress) => void;
}

export function AchievementGrid({
  achievements,
  showProgress = true,
  size = 'md',
  onAchievementClick,
}: AchievementGridProps) {
  // Separate achievements by status
  const earned = achievements.filter(a => a.earned);
  const inProgress = achievements.filter(a => !a.earned && a.progress && a.progress.current > 0);
  const locked = achievements.filter(a => !a.earned && (!a.progress || a.progress.current === 0));

  // Hide hidden achievements that aren't earned
  const visibleLocked = locked.filter(a => !a.is_hidden);

  return (
    <div className="space-y-6">
      {/* Earned Section */}
      {earned.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            Earned ({earned.length})
          </h3>
          <div className="flex flex-wrap gap-4">
            {earned.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                category={achievement.category}
                earned={true}
                size={size}
                onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* In Progress Section */}
      {showProgress && inProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            In Progress ({inProgress.length})
          </h3>
          <div className="flex flex-wrap gap-4">
            {inProgress.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                category={achievement.category}
                earned={false}
                progress={achievement.progress}
                size={size}
                onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Section */}
      {showProgress && visibleLocked.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Locked ({visibleLocked.length})
          </h3>
          <div className="flex flex-wrap gap-4">
            {visibleLocked.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                name={achievement.name}
                description={achievement.description}
                icon={achievement.icon}
                category={achievement.category}
                earned={false}
                size={size}
                onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {achievements.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No achievements available yet.</p>
        </div>
      )}

      {/* All earned message */}
      {earned.length === achievements.length && achievements.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          You&apos;ve earned all achievements in this challenge!
        </div>
      )}
    </div>
  );
}

// Compact grid for profile display (earned only, no sections)
interface CompactAchievementGridProps {
  achievements: AchievementWithProgress[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  onAchievementClick?: (achievement: AchievementWithProgress) => void;
  onViewAll?: () => void;
}

export function CompactAchievementGrid({
  achievements,
  maxDisplay = 5,
  size = 'sm',
  onAchievementClick,
  onViewAll,
}: CompactAchievementGridProps) {
  const earned = achievements.filter(a => a.earned);
  const displayAchievements = earned.slice(0, maxDisplay);
  const remainingCount = earned.length - maxDisplay;

  if (earned.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {displayAchievements.map(achievement => (
        <AchievementBadge
          key={achievement.id}
          name={achievement.name}
          description={achievement.description}
          icon={achievement.icon}
          category={achievement.category}
          earned={true}
          size={size}
          showName={false}
          onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <button
          onClick={onViewAll}
          className="w-12 h-12 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          +{remainingCount}
        </button>
      )}
    </div>
  );
}
