import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface CreatorBadgeProps {
  className?: string;
}

export function CreatorBadge({ className }: CreatorBadgeProps) {
  return (
    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${className || ''}`}>
      <Crown className="h-3 w-3" />
      Creator
    </Badge>
  );
}
