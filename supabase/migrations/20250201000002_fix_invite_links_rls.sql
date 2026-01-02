-- Fix RLS policies for challenge_invite_links table
-- The issue is that nested queries on the challenges table are subject to RLS,
-- which can cause the policy check to fail. We use a SECURITY DEFINER function
-- to bypass RLS when checking ownership.

-- Create a helper function that bypasses RLS to check if user is challenge creator
CREATE OR REPLACE FUNCTION public.user_is_challenge_creator(p_challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM challenges
    WHERE id = p_challenge_id
    AND creator_id = auth.uid()
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Creators can insert invite links" ON challenge_invite_links;
DROP POLICY IF EXISTS "Creators can update their invite links" ON challenge_invite_links;
DROP POLICY IF EXISTS "Creators can delete their invite links" ON challenge_invite_links;

-- Recreate policies using the helper function
CREATE POLICY "Creators can insert invite links"
  ON challenge_invite_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_is_challenge_creator(challenge_id)
  );

CREATE POLICY "Creators can update their invite links"
  ON challenge_invite_links
  FOR UPDATE
  TO authenticated
  USING (
    public.user_is_challenge_creator(challenge_id)
  )
  WITH CHECK (
    public.user_is_challenge_creator(challenge_id)
  );

CREATE POLICY "Creators can delete their invite links"
  ON challenge_invite_links
  FOR DELETE
  TO authenticated
  USING (
    public.user_is_challenge_creator(challenge_id)
  );
