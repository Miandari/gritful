-- Activity Feed System Migration
-- Creates separate table structure for challenge activity feed
-- Includes: activity_feed, reactions, comments, triggers, RLS policies

-- =============================================
-- 1. MAIN ACTIVITY FEED TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS challenge_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,

  -- Activity classification
  activity_type VARCHAR(50) NOT NULL,
  -- Types: 'entry_log', 'social_post', 'streak_milestone', 'join_challenge'

  reference_type VARCHAR(50),
  -- 'daily_entry', 'streak', null for social posts

  reference_id UUID,
  -- Points to the actual entry/streak record

  -- Content
  message TEXT,
  -- Auto-generated or user-written

  metadata JSONB,
  -- Flexible storage: {points, metrics, photos, streak_days, etc}

  -- Engagement tracking (denormalized for performance)
  reaction_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_challenge
  ON challenge_activity_feed(challenge_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user
  ON challenge_activity_feed(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_reference
  ON challenge_activity_feed(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_activity_feed_type
  ON challenge_activity_feed(challenge_id, activity_type, created_at DESC);

-- =============================================
-- 2. REACTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES challenge_activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reaction_type VARCHAR(20) DEFAULT 'cheer',
  -- Types: 'cheer', 'fire', 'muscle', 'heart', 'clap'
  created_at TIMESTAMP DEFAULT NOW(),

  -- One reaction type per user per activity
  UNIQUE(activity_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity
  ON activity_reactions(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_reactions_user
  ON activity_reactions(user_id);

-- =============================================
-- 3. COMMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES challenge_activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Validation
  CONSTRAINT comment_length CHECK (char_length(comment) >= 1 AND char_length(comment) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity
  ON activity_comments(activity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_comments_user
  ON activity_comments(user_id);

-- =============================================
-- 4. READ TRACKING
-- =============================================

-- Add feed read tracking to challenge_participants
ALTER TABLE challenge_participants
  ADD COLUMN IF NOT EXISTS last_activity_read_at TIMESTAMP DEFAULT NOW();

-- =============================================
-- 5. TRIGGERS FOR AUTO-LOGGING
-- =============================================

-- Trigger 1: Log daily entries to feed
CREATE OR REPLACE FUNCTION log_entry_to_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when entry becomes completed (not already completed)
  -- For INSERT: log if completed
  -- For UPDATE: only log if it wasn't completed before
  IF NEW.is_completed = true AND (TG_OP = 'INSERT' OR OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    INSERT INTO challenge_activity_feed (
      challenge_id,
      user_id,
      activity_type,
      reference_type,
      reference_id,
      message,
      metadata
    )
    SELECT
      cp.challenge_id,
      cp.user_id,
      'entry_log',
      'daily_entry',
      NEW.id,
      'completed their daily entry',
      jsonb_build_object(
        'entry_date', NEW.entry_date,
        'points_earned', NEW.points_earned,
        'bonus_points', COALESCE(NEW.bonus_points, 0),
        'is_perfect_day', COALESCE(NEW.bonus_points, 0) > 0
      )
    FROM challenge_participants cp
    WHERE cp.id = NEW.participant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_entry_to_feed_trigger
AFTER INSERT OR UPDATE ON daily_entries
FOR EACH ROW
EXECUTE FUNCTION log_entry_to_feed();

-- Trigger 2: Update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_activity_feed
    SET reaction_count = reaction_count + 1
    WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_activity_feed
    SET reaction_count = reaction_count - 1
    WHERE id = OLD.activity_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_reaction_count_trigger
AFTER INSERT OR DELETE ON activity_reactions
FOR EACH ROW
EXECUTE FUNCTION update_reaction_count();

-- Trigger 3: Update comment counts
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_activity_feed
    SET comment_count = comment_count + 1
    WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_activity_feed
    SET comment_count = comment_count - 1
    WHERE id = OLD.activity_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_comment_count_trigger
AFTER INSERT OR DELETE ON activity_comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();

-- =============================================
-- 6. RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE challenge_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- Policy: View feed items for challenges you're in
CREATE POLICY "Users can view feed items for their challenges"
  ON challenge_activity_feed
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_challenge_access
      WHERE user_id = auth.uid()
      AND challenge_id = challenge_activity_feed.challenge_id
    )
  );

-- Policy: Create social posts in your challenges
CREATE POLICY "Users can create social posts in their challenges"
  ON challenge_activity_feed
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    activity_type = 'social_post' AND
    EXISTS (
      SELECT 1 FROM user_challenge_access
      WHERE user_id = auth.uid()
      AND challenge_id = challenge_activity_feed.challenge_id
    )
  );

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own social posts"
  ON challenge_activity_feed
  FOR UPDATE
  USING (auth.uid() = user_id AND activity_type = 'social_post')
  WITH CHECK (auth.uid() = user_id AND activity_type = 'social_post');

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own social posts"
  ON challenge_activity_feed
  FOR DELETE
  USING (auth.uid() = user_id AND activity_type = 'social_post');

-- Policy: View reactions for accessible activities
CREATE POLICY "Users can view reactions for accessible activities"
  ON activity_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_activity_feed af
      JOIN user_challenge_access uca ON uca.challenge_id = af.challenge_id
      WHERE af.id = activity_reactions.activity_id
      AND uca.user_id = auth.uid()
    )
  );

-- Policy: Create reactions
CREATE POLICY "Users can add reactions to accessible activities"
  ON activity_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenge_activity_feed af
      JOIN user_challenge_access uca ON uca.challenge_id = af.challenge_id
      WHERE af.id = activity_reactions.activity_id
      AND uca.user_id = auth.uid()
    )
  );

-- Policy: Delete own reactions
CREATE POLICY "Users can remove their own reactions"
  ON activity_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: View comments
CREATE POLICY "Users can view comments for accessible activities"
  ON activity_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_activity_feed af
      JOIN user_challenge_access uca ON uca.challenge_id = af.challenge_id
      WHERE af.id = activity_comments.activity_id
      AND uca.user_id = auth.uid()
    )
  );

-- Policy: Create comments
CREATE POLICY "Users can add comments to accessible activities"
  ON activity_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenge_activity_feed af
      JOIN user_challenge_access uca ON uca.challenge_id = af.challenge_id
      WHERE af.id = activity_comments.activity_id
      AND uca.user_id = auth.uid()
    )
  );

-- Policy: Update own comments
CREATE POLICY "Users can update their own comments"
  ON activity_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Delete own comments
CREATE POLICY "Users can delete their own comments"
  ON activity_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to get unread activity count for a challenge
CREATE OR REPLACE FUNCTION get_unread_activity_count(p_challenge_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM challenge_activity_feed af
  JOIN challenge_participants cp ON cp.challenge_id = af.challenge_id
  WHERE af.challenge_id = p_challenge_id
    AND cp.user_id = p_user_id
    AND af.created_at > COALESCE(cp.last_activity_read_at, '1970-01-01'::TIMESTAMP);
$$ LANGUAGE SQL STABLE;

-- Function to get total unread activities across all challenges
CREATE OR REPLACE FUNCTION get_total_unread_activities(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM challenge_activity_feed af
  JOIN challenge_participants cp ON cp.challenge_id = af.challenge_id
  WHERE cp.user_id = p_user_id
    AND af.created_at > COALESCE(cp.last_activity_read_at, '1970-01-01'::TIMESTAMP);
$$ LANGUAGE SQL STABLE;
