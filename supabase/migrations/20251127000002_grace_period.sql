-- Migration: Add grace period support for challenges
-- Description: Allows challenges to have a configurable grace period after end date
-- Grace period keeps challenges in Active view for X days after ends_at, with amber indicator

-- Add grace_period_days column with default of 7 days
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 7;

-- Add constraint to limit grace period between 0 and 14 days
-- Using DO block to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_grace_period'
  ) THEN
    ALTER TABLE public.challenges
    ADD CONSTRAINT valid_grace_period CHECK (grace_period_days >= 0 AND grace_period_days <= 14);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.challenges.grace_period_days IS 'Number of days after ends_at when challenge remains active for entry logging. Default 7, range 0-14.';
