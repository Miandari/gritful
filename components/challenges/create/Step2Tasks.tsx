'use client';

import { useState } from 'react';
import { Plus, GripVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChallengeWizardStore } from '@/lib/stores/challengeStore';
import { MetricBuilder } from './TaskBuilder';
import { MetricFormData } from '@/lib/validations/challenge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskCardProps {
  metric: MetricFormData;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableTaskCard({ metric, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metric.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      boolean: 'Yes/No',
      number: 'Number',
      duration: 'Duration',
      choice: 'Multiple Choice',
      text: 'Text',
      file: 'File Upload',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-3">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-5 w-5 text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{metric.name}</span>
              <Badge variant="secondary">{getTypeLabel(metric.type)}</Badge>
              {metric.required && <Badge variant="outline">Required</Badge>}
              <Badge variant="default" className="bg-blue-600">{metric.points || 1} pts</Badge>
            </div>
            {metric.config?.units && (
              <span className="text-sm text-gray-500">Units: {metric.config.units}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface Step2TasksProps {
  onNext: () => void;
  onPrev: () => void;
}

export function Step2Tasks({ onNext, onPrev }: Step2TasksProps) {
  const { metrics, addMetric, updateMetric, removeMetric, reorderMetrics } =
    useChallengeWizardStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricFormData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = metrics.findIndex((m) => m.id === active.id);
      const newIndex = metrics.findIndex((m) => m.id === over?.id);

      const reorderedMetrics = arrayMove(metrics, oldIndex, newIndex).map((m, index) => ({
        ...m,
        order: index,
      }));

      reorderMetrics(reorderedMetrics);
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(null);
    setIsDialogOpen(true);
  };

  const handleEditMetric = (metric: MetricFormData) => {
    setEditingMetric(metric);
    setIsDialogOpen(true);
  };

  const handleSaveMetric = (metric: Partial<MetricFormData>) => {
    if (editingMetric) {
      updateMetric(editingMetric.id, metric);
    } else {
      addMetric(metric as Omit<MetricFormData, 'id' | 'order'>);
    }
    setIsDialogOpen(false);
    setEditingMetric(null);
  };

  const handleNext = () => {
    if (metrics.length === 0) {
      alert('Please add at least one task');
      return;
    }
    onNext();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Define Your Tasks</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add the things you want to track in this challenge
        </p>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-gray-600">No tasks added yet</p>
            <Button onClick={handleAddMetric}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={metrics} strategy={verticalListSortingStrategy}>
              {metrics.map((metric) => (
                <SortableTaskCard
                  key={metric.id}
                  metric={metric}
                  onEdit={() => handleEditMetric(metric)}
                  onDelete={() => removeMetric(metric.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button onClick={handleAddMetric} variant="outline" className="mt-4 w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Task
          </Button>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          </DialogHeader>
          <MetricBuilder
            metric={editingMetric || {}}
            onSave={handleSaveMetric}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button onClick={handleNext}>Next: Settings</Button>
      </div>
    </div>
  );
}