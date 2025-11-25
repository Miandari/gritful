'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChallengeTemplate } from '@/lib/templates/challengeTemplates';
import {
  Dumbbell,
  Heart,
  Target,
  Sunrise,
  GraduationCap,
  BookOpen,
  Sparkles,
  Zap,
  Eye
} from 'lucide-react';

interface TemplateCardProps {
  template: ChallengeTemplate;
  onSelect: (template: ChallengeTemplate) => void;
  onPreview?: (template: ChallengeTemplate) => void;
}

const iconMap = {
  Dumbbell,
  Heart,
  Target,
  Sunrise,
  GraduationCap,
  BookOpen,
  Sparkles,
  Zap,
};

const categoryColors = {
  fitness: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  productivity: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  learning: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  wellness: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const Icon = iconMap[template.icon as keyof typeof iconMap] || Target;

  return (
    <Card className="group hover:border-green-500 dark:hover:border-green-500 transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <Badge className={`mt-1 ${categoryColors[template.category]}`} variant="secondary">
                {template.category}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm mt-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{template.metrics.length}</span> tasks to track
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onSelect(template)}
              className="flex-1"
              size="sm"
            >
              Use Template
            </Button>
            {onPreview && (
              <Button
                onClick={() => onPreview(template)}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
