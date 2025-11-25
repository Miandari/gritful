-- Migration: Add support for ongoing/endless challenges
-- Description: Allows challenges without a fixed end date

-- 1. Remove NOT NULL constraints from duration_days and ends_at columns
-- This allows ongoing challenges to have NULL values for these fields
ALTER TABLE public.challenges ALTER COLUMN duration_days DROP NOT NULL;
ALTER TABLE public.challenges ALTER COLUMN ends_at DROP NOT NULL;

-- 2. Modify duration constraint to allow NULL (for ongoing challenges)
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS valid_duration;
ALTER TABLE public.challenges ADD CONSTRAINT valid_duration CHECK (duration_days > 0 OR duration_days IS NULL);

-- 3. Modify dates constraint to allow NULL ends_at
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS valid_dates;
ALTER TABLE public.challenges ADD CONSTRAINT valid_dates CHECK (ends_at IS NULL OR ends_at >= starts_at);

-- 4. Add ended_at column to track when creator manually ended an ongoing challenge
-- This differentiates between:
--   - ends_at IS NULL: Active ongoing challenge
--   - ends_at IS NOT NULL AND ended_at IS NULL: Fixed-duration challenge
--   - ended_at IS NOT NULL: Challenge was manually ended by creator
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Add comment for documentation
COMMENT ON COLUMN public.challenges.ended_at IS 'Timestamp when creator manually ended an ongoing challenge. NULL for fixed-duration challenges or still-active ongoing challenges.';
