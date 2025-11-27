'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS, type AchievementCategory } from '@/lib/achievements/types';

interface AchievementPopupProps {
  achievement: {
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function AchievementPopup({ achievement, open, onClose }: AchievementPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      // Start animation after a brief delay
      const timer = setTimeout(() => setIsAnimating(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  if (!achievement) return null;

  const colors = CATEGORY_COLORS[achievement.category];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center p-8">
        <DialogTitle className="sr-only">Achievement Unlocked</DialogTitle>

        {/* Sparkle animation background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn(
            'absolute inset-0 transition-opacity duration-500',
            isAnimating ? 'opacity-100' : 'opacity-0'
          )}>
            {/* Animated sparkles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <span className="text-yellow-400 text-lg">*</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground">
            Achievement Unlocked!
          </h2>

          {/* Badge */}
          <div className={cn(
            'mx-auto w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500',
            colors.bg,
            colors.border,
            isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}>
            <span className="text-4xl drop-shadow-lg">{achievement.icon}</span>
          </div>

          {/* Name */}
          <h3 className={cn(
            'text-2xl font-bold transition-all duration-500 delay-100',
            isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}>
            {achievement.name}
          </h3>

          {/* Description */}
          <p className={cn(
            'text-muted-foreground transition-all duration-500 delay-200',
            isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}>
            &quot;{achievement.description}&quot;
          </p>

          {/* Button */}
          <div className={cn(
            'pt-4 transition-all duration-500 delay-300',
            isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}>
            <Button onClick={onClose} className="w-full">
              Awesome!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Queue component to show multiple achievements in sequence
interface AchievementQueueProps {
  achievements: Array<{
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;
  }>;
  onComplete: () => void;
}

export function AchievementQueue({ achievements, onComplete }: AchievementQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(achievements.length > 0);

  const handleClose = () => {
    if (currentIndex < achievements.length - 1) {
      // Show next achievement
      setCurrentIndex(prev => prev + 1);
    } else {
      // All done
      setIsOpen(false);
      onComplete();
    }
  };

  useEffect(() => {
    if (achievements.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [achievements]);

  if (achievements.length === 0) return null;

  return (
    <AchievementPopup
      achievement={achievements[currentIndex]}
      open={isOpen}
      onClose={handleClose}
    />
  );
}
