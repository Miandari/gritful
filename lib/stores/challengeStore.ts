import { create } from 'zustand';
import { MetricFormData, ChallengeFormData, generateMetricId } from '@/lib/validations/challenge';
import { ChallengeTemplate } from '@/lib/templates/challengeTemplates';

interface ChallengeWizardState {
  currentStep: number;
  formData: Partial<ChallengeFormData>;
  metrics: MetricFormData[];

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<ChallengeFormData>) => void;
  addMetric: (metric: Omit<MetricFormData, 'id' | 'order'>) => void;
  updateMetric: (id: string, metric: Partial<MetricFormData>) => void;
  removeMetric: (id: string) => void;
  reorderMetrics: (metrics: MetricFormData[]) => void;
  loadFromTemplate: (template: ChallengeTemplate) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  formData: {
    name: '',
    description: '',
    duration_days: 30,
    is_ongoing: false,
    starts_at: new Date().toISOString().split('T')[0],
    is_public: true,
    is_template: false,
    lock_entries_after_day: false,
    failure_mode: 'flexible' as const,
    grace_period_days: 7,
  },
  metrics: [],
};

export const useChallengeWizardStore = create<ChallengeWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),

  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  addMetric: (metric) =>
    set((state) => {
      const newMetric: MetricFormData = {
        ...metric,
        id: generateMetricId(),
        order: state.metrics.length,
      };
      return {
        metrics: [...state.metrics, newMetric],
      };
    }),

  updateMetric: (id, metric) =>
    set((state) => ({
      metrics: state.metrics.map((m) => (m.id === id ? { ...m, ...metric } : m)),
    })),

  removeMetric: (id) =>
    set((state) => {
      const filtered = state.metrics.filter((m) => m.id !== id);
      // Reorder remaining metrics
      return {
        metrics: filtered.map((m, index) => ({ ...m, order: index })),
      };
    }),

  reorderMetrics: (metrics) => set({ metrics }),

  loadFromTemplate: (template) => {
    const metricsWithIds: MetricFormData[] = template.metrics.map((metric, index) => ({
      ...metric,
      id: generateMetricId(),
      order: index,
    }));

    set({
      currentStep: 1,
      formData: {
        ...initialState.formData,
        name: template.name,
        enable_streak_bonus: template.settings.enable_streak_bonus,
        streak_bonus_points: template.settings.streak_bonus_points,
        enable_perfect_day_bonus: template.settings.enable_perfect_day_bonus,
        perfect_day_bonus_points: template.settings.perfect_day_bonus_points,
        lock_entries_after_day: template.settings.lock_entries_after_day,
      },
      metrics: metricsWithIds,
    });
  },

  reset: () => set(initialState),
}));