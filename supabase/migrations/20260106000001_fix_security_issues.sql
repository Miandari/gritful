-- Migration: Fix Security Issues flagged by Supabase
-- 1. Recreate participant_details view with SECURITY INVOKER (respects RLS)
-- 2. Enable RLS on user_challenge_access table

-- =====================================================
-- FIX 1: Recreate participant_details view safely
-- =====================================================
-- The view was created with SECURITY DEFINER which bypasses RLS,
-- allowing any user to see all participants across all challenges.
--
-- We recreate it with SECURITY INVOKER (the default) so that
-- queries respect the RLS policies on challenge_participants and profiles.

DROP VIEW IF EXISTS public.participant_details;

CREATE VIEW public.participant_details
WITH (security_invoker = true)
AS
SELECT
    cp.id,
    cp.challenge_id,
    cp.user_id,
    cp.status,
    cp.current_streak,
    cp.longest_streak,
    p.username,
    p.avatar_url
FROM challenge_participants cp
LEFT JOIN profiles p ON p.id = cp.user_id;

-- Grant access to authenticated users (same as other tables)
GRANT SELECT ON public.participant_details TO authenticated;

-- =====================================================
-- FIX 2: Enable RLS on user_challenge_access
-- =====================================================
-- This table controls who can access which challenges.
-- Without RLS, any authenticated user could read/modify all access records.

-- Enable RLS (idempotent - safe to run if already enabled)
ALTER TABLE public.user_challenge_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own access" ON public.user_challenge_access;

-- Recreate the SELECT policy
-- Users should only be able to see their own access records
CREATE POLICY "Users can view own access"
ON public.user_challenge_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for regular users
-- The user_challenge_access table is managed by triggers on:
-- - challenges (maintain_access_on_challenge_insert)
-- - challenge_participants (maintain_access_on_participant_insert, maintain_access_on_participant_delete)
-- These triggers use SECURITY DEFINER functions to insert/update/delete records

-- =====================================================
-- VERIFICATION QUERIES (run these after applying)
-- =====================================================
-- Check view security setting:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'participant_details';
--
-- Check RLS is enabled on access table:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'user_challenge_access';
--
-- Check policies exist:
-- SELECT * FROM pg_policies WHERE tablename = 'user_challenge_access';
