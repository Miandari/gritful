-- Migration: One-time Task Completions
-- Description: Add support for one-time tasks with optional deadlines
-- Date: 2025-11-24

-- ============================================================================
-- 1. Create onetime_task_completions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.onetime_task_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,  -- References task.id in challenge.metrics JSONB

    -- Completion data (same structure as daily entries)
    value JSONB NOT NULL,
    points_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One completion per task per participant
    UNIQUE(participant_id, task_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.onetime_task_completions IS 'Stores completions for one-time (non-recurring) tasks within challenges';
COMMENT ON COLUMN public.onetime_task_completions.task_id IS 'References the metric/task id stored in challenges.metrics JSONB array';
COMMENT ON COLUMN public.onetime_task_completions.value IS 'The completion value - format depends on task type (boolean, number, text, etc.)';

-- ============================================================================
-- 2. Create indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_onetime_completions_participant
ON public.onetime_task_completions(participant_id);

CREATE INDEX IF NOT EXISTS idx_onetime_completions_task
ON public.onetime_task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_onetime_completions_completed_at
ON public.onetime_task_completions(completed_at DESC);

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.onetime_task_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- Policy: Users can manage their own one-time task completions
CREATE POLICY "Users can manage own onetime completions"
ON public.onetime_task_completions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        WHERE cp.id = participant_id AND cp.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        WHERE cp.id = participant_id AND cp.user_id = auth.uid()
    )
);

-- Policy: Users can view completions for challenges they have access to
CREATE POLICY "Users can view challenge onetime completions"
ON public.onetime_task_completions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        JOIN public.user_challenge_access uca ON uca.challenge_id = cp.challenge_id
        WHERE cp.id = participant_id AND uca.user_id = auth.uid()
    )
);

-- ============================================================================
-- 5. Create updated_at trigger
-- ============================================================================

-- Create trigger function if it doesn't exist (may already exist from other tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for onetime_task_completions
DROP TRIGGER IF EXISTS update_onetime_task_completions_updated_at ON public.onetime_task_completions;
CREATE TRIGGER update_onetime_task_completions_updated_at
    BEFORE UPDATE ON public.onetime_task_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onetime_task_completions TO authenticated;
GRANT SELECT ON public.onetime_task_completions TO anon;
