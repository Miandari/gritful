import { Crown, Infinity } from 'lucide-react';

interface CreatorRibbonProps {
  className?: string;
  showOngoing?: boolean;
}

export function CreatorRibbon({ className, showOngoing }: CreatorRibbonProps) {
  return (
    <div className={`absolute top-2 right-2 z-10 pointer-events-none flex items-center gap-1.5 ${className || ''}`}>
      <div className="bg-amber-500 text-amber-950 text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
        <Crown className="h-3 w-3" />
        Creator
      </div>
      {showOngoing && (
        <div className="bg-background border text-foreground text-xs font-medium px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
          <Infinity className="h-3 w-3" />
          Ongoing
        </div>
      )}
    </div>
  );
}

// Keep old export for backwards compatibility during transition
export { CreatorRibbon as CreatorBadge };
