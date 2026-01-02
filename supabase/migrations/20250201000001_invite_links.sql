-- Invite Link System for Private Challenges
-- This migration adds tables for shareable invite links with configurable settings

-- =============================================================================
-- INVITE LINKS TABLE
-- =============================================================================
-- Stores invite links for private challenges
-- Each challenge can have one active invite link at a time

CREATE TABLE IF NOT EXISTS public.challenge_invite_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    token VARCHAR(20) NOT NULL UNIQUE,

    -- Settings
    auto_admit BOOLEAN DEFAULT true,  -- true = instant join, false = requires approval
    expires_at TIMESTAMPTZ,           -- NULL = never expires
    max_uses INTEGER,                 -- NULL = unlimited

    -- Tracking
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,   -- false = revoked

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON public.challenge_invite_links(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_links_challenge ON public.challenge_invite_links(challenge_id);

-- =============================================================================
-- INVITE LINK USES TABLE
-- =============================================================================
-- Tracks who used which invite link (for analytics and preventing duplicate uses)

CREATE TABLE IF NOT EXISTS public.invite_link_uses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invite_link_id UUID NOT NULL REFERENCES public.challenge_invite_links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    result VARCHAR(20) NOT NULL,  -- 'joined', 'request_created', 'already_member', 'expired', 'max_uses_reached'

    -- Each user can only use a link once
    UNIQUE(invite_link_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_link_uses_link ON public.invite_link_uses(invite_link_id);
CREATE INDEX IF NOT EXISTS idx_invite_link_uses_user ON public.invite_link_uses(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.challenge_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_link_uses ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- INVITE LINKS POLICIES
-- -----------------------------------------------------------------------------

-- Anyone authenticated can view active invite links by token (for join flow)
CREATE POLICY "Anyone can view active invite links by token"
ON public.challenge_invite_links FOR SELECT
TO authenticated
USING (is_active = true);

-- Challenge creators can manage their invite links (all operations)
CREATE POLICY "Creators can insert invite links"
ON public.challenge_invite_links FOR INSERT
TO authenticated
WITH CHECK (
    challenge_id IN (
        SELECT id FROM public.challenges WHERE creator_id = auth.uid()
    )
);

CREATE POLICY "Creators can update their invite links"
ON public.challenge_invite_links FOR UPDATE
TO authenticated
USING (
    challenge_id IN (
        SELECT id FROM public.challenges WHERE creator_id = auth.uid()
    )
)
WITH CHECK (
    challenge_id IN (
        SELECT id FROM public.challenges WHERE creator_id = auth.uid()
    )
);

CREATE POLICY "Creators can delete their invite links"
ON public.challenge_invite_links FOR DELETE
TO authenticated
USING (
    challenge_id IN (
        SELECT id FROM public.challenges WHERE creator_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- INVITE LINK USES POLICIES
-- -----------------------------------------------------------------------------

-- Users can insert their own link uses (when they join via link)
CREATE POLICY "Users can insert own link uses"
ON public.invite_link_uses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can view their own link uses
CREATE POLICY "Users can view own link uses"
ON public.invite_link_uses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Creators can view link uses for their challenges (for analytics)
CREATE POLICY "Creators can view link uses for their challenges"
ON public.invite_link_uses FOR SELECT
TO authenticated
USING (
    invite_link_id IN (
        SELECT il.id FROM public.challenge_invite_links il
        JOIN public.challenges c ON il.challenge_id = c.id
        WHERE c.creator_id = auth.uid()
    )
);

-- =============================================================================
-- FUNCTION: Increment use count atomically
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_invite_link_use_count(link_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.challenge_invite_links
    SET use_count = use_count + 1,
        updated_at = NOW()
    WHERE id = link_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_invite_link_use_count(UUID) TO authenticated;
