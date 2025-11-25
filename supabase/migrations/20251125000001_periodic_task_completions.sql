-- Migration: Add periodic_task_completions table for weekly and monthly tasks
-- This table stores completions for both weekly and monthly frequency tasks

CREATE TABLE IF NOT EXISTS public.periodic_task_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,  -- References task.id in challenge.metrics JSONB

    -- Period identification
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,  -- Monday for weekly, 1st of month for monthly
    period_end DATE NOT NULL,    -- Sunday for weekly, last day of month for monthly

    -- Completion data
    value JSONB NOT NULL,
    points_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One completion per task per participant per period
    UNIQUE(participant_id, task_id, period_start)
);

-- Enable RLS
ALTER TABLE public.periodic_task_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own periodic completions
CREATE POLICY "Users can manage own periodic completions"
ON public.periodic_task_completions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        WHERE cp.id = participant_id AND cp.user_id = auth.uid()
    )
);

-- Policy: Users can view completions for challenges they have access to
CREATE POLICY "Users can view challenge periodic completions"
ON public.periodic_task_completions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        JOIN public.user_challenge_access uca ON uca.challenge_id = cp.challenge_id
        WHERE cp.id = participant_id AND uca.user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX idx_periodic_completions_participant ON public.periodic_task_completions(participant_id);
CREATE INDEX idx_periodic_completions_task ON public.periodic_task_completions(task_id);
CREATE INDEX idx_periodic_completions_period ON public.periodic_task_completions(period_start, period_end);
CREATE INDEX idx_periodic_completions_completed_at ON public.periodic_task_completions(completed_at);
