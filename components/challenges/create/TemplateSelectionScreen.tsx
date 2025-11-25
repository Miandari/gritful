'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles } from 'lucide-react';
import { ChallengeTemplate, challengeTemplates, templateCategories } from '@/lib/templates/challengeTemplates';
import { TemplateCard } from './TemplateCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TemplateSelectionScreenProps {
  onSelectTemplate: (template: ChallengeTemplate | null) => void;
}

export function TemplateSelectionScreen({ onSelectTemplate }: TemplateSelectionScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<ChallengeTemplate | null>(null);

  const filteredTemplates = selectedCategory === 'all'
    ? challengeTemplates
    : challengeTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Choose Method */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose how to create</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-green-500 dark:hover:border-green-500 transition-all duration-200 hover:shadow-lg group"
            onClick={() => onSelectTemplate(null)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                  <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Start from Scratch</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a custom challenge with your own tasks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500 dark:border-green-500 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Use a Template</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quick start with pre-configured challenges
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Template Gallery */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Browse Popular Templates</h2>
          <p className="text-sm text-muted-foreground">
            Choose a template and customize it to fit your needs
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {templateCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id ? 'bg-green-600 dark:bg-green-600 hover:bg-green-700' : ''}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
              onPreview={setPreviewTemplate}
            />
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{previewTemplate?.name}</DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="font-semibold mb-3">Tasks to Track</h3>
                <div className="space-y-3">
                  {previewTemplate.metrics.map((metric, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{metric.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Type: {metric.type}
                              {metric.required ? ' • Required' : ' • Optional'}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{metric.points} pts</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Bonus Points</h3>
                <div className="space-y-2 text-sm">
                  {previewTemplate.settings.enable_streak_bonus && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>Streak Bonus</span>
                      <Badge variant="secondary">+{previewTemplate.settings.streak_bonus_points} pts</Badge>
                    </div>
                  )}
                  {previewTemplate.settings.enable_perfect_day_bonus && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>Perfect Day Bonus</span>
                      <Badge variant="secondary">+{previewTemplate.settings.perfect_day_bonus_points} pts</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onSelectTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="flex-1"
                >
                  Use This Template
                </Button>
                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
