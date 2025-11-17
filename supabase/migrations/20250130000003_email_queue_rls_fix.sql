-- Migration: Fix RLS policy for email_queue to allow authenticated users to insert
-- Description: Allows authenticated users to queue emails (needed for challenge creators sending updates)
-- The sendChallengeUpdate action validates that only challenge creators can send updates

-- Allow authenticated users to insert emails into the queue
CREATE POLICY "Authenticated users can queue emails"
  ON public.email_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "Authenticated users can queue emails" ON public.email_queue IS
'Allows authenticated users to queue emails. The sendChallengeUpdate server action validates that only challenge creators can send updates.';
