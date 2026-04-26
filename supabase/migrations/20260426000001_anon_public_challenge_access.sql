-- Migration: Allow anonymous users to view public challenge data
-- Purpose: Enable unauthenticated users to see public challenge previews
-- when they receive a shared link (before signing up/logging in).

-- 1. Public challenges viewable by anyone
CREATE POLICY "Anon can view public challenges"
ON public.challenges FOR SELECT
TO anon
USING (is_public = true);

-- 2. Profiles: only creators of public challenges (prevents user table scraping)
CREATE POLICY "Anon can view profiles linked to public challenges"
ON public.profiles FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.is_public = true AND c.creator_id = profiles.id
    )
);

-- 3. Participant count via SECURITY DEFINER function
-- Returns just an integer. Anon never sees challenge_participants rows.
-- Validates is_public = true internally -- returns 0 for private challenges.
CREATE OR REPLACE FUNCTION public.get_public_challenge_participant_count(p_challenge_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM challenge_participants cp
    JOIN challenges c ON c.id = cp.challenge_id
    WHERE cp.challenge_id = p_challenge_id
      AND cp.status = 'active'
      AND c.is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_challenge_participant_count(UUID) TO anon;

-- Ensure anon role has SELECT on these tables
GRANT SELECT ON public.challenges TO anon;
GRANT SELECT ON public.profiles TO anon;
