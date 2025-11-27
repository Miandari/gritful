-- Achievement System Migration
-- Creates tables for challenge achievements and participant earned achievements

-- ============================================================================
-- 1. CHALLENGE_ACHIEVEMENTS TABLE
-- ============================================================================
-- Stores achievement definitions (both default and custom per-challenge)

CREATE TABLE IF NOT EXISTS challenge_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NULL = default achievement available in all challenges
  -- UUID = custom achievement for specific challenge
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,

  -- Category for grouping and styling
  category VARCHAR(50) NOT NULL CHECK (category IN ('streak', 'points', 'completion', 'consistency', 'custom')),

  -- What triggers this achievement
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'streak_days',      -- current or longest streak >= value
    'total_points',     -- total points >= value
    'entries_logged',   -- number of entries >= value
    'perfect_days',     -- days with all tasks complete >= value
    'completion_rate',  -- completion percentage >= value (at challenge end)
    'challenge_complete', -- finished the challenge
    'early_entries',    -- entries before 9am >= value
    'late_entries'      -- entries after 9pm >= value
  )),

  -- Threshold value to earn (e.g., 7 for 7-day streak)
  trigger_value INTEGER NOT NULL,

  -- Hidden achievements are revealed only when earned
  is_hidden BOOLEAN DEFAULT false,

  -- Display order for consistent UI
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of challenge-specific achievements
CREATE INDEX IF NOT EXISTS idx_achievements_challenge ON challenge_achievements(challenge_id);

-- ============================================================================
-- 2. PARTICIPANT_ACHIEVEMENTS TABLE
-- ============================================================================
-- Tracks which achievements each participant has earned

CREATE TABLE IF NOT EXISTS participant_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES challenge_achievements(id) ON DELETE CASCADE,

  earned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Whether user has been notified (for popup)
  notified BOOLEAN DEFAULT false,

  -- Prevent duplicate achievements
  UNIQUE(participant_id, achievement_id)
);

-- Index for quick lookup of participant's achievements
CREATE INDEX IF NOT EXISTS idx_participant_achievements_participant ON participant_achievements(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_achievements_achievement ON participant_achievements(achievement_id);

-- ============================================================================
-- 3. SEED DEFAULT ACHIEVEMENTS
-- ============================================================================
-- These are available in ALL challenges (challenge_id = NULL)

INSERT INTO challenge_achievements (challenge_id, name, description, icon, category, trigger_type, trigger_value, display_order)
VALUES
  -- Streak Achievements
  (NULL, 'First Week', 'Completed a 7-day streak', '🔥', 'streak', 'streak_days', 7, 1),
  (NULL, 'Two Weeks Strong', 'Completed a 14-day streak', '🔥', 'streak', 'streak_days', 14, 2),
  (NULL, 'Month Master', 'Completed a 30-day streak', '🌟', 'streak', 'streak_days', 30, 3),
  (NULL, 'Century Club', 'Completed a 100-day streak', '💯', 'streak', 'streak_days', 100, 4),

  -- Points Achievements
  (NULL, 'Rising Star', 'Earned 100 points', '⭐', 'points', 'total_points', 100, 5),
  (NULL, 'High Achiever', 'Earned 500 points', '🌟', 'points', 'total_points', 500, 6),
  (NULL, 'Thousand Club', 'Earned 1,000 points', '🏆', 'points', 'total_points', 1000, 7),
  (NULL, 'Point Legend', 'Earned 5,000 points', '👑', 'points', 'total_points', 5000, 8),

  -- Completion Achievements
  (NULL, 'First Step', 'Logged your first entry', '👣', 'completion', 'entries_logged', 1, 9),
  (NULL, 'Perfect Week', '7 days with all tasks complete', '✨', 'completion', 'perfect_days', 7, 10),
  (NULL, 'Challenge Complete', 'Completed the challenge', '🎯', 'completion', 'challenge_complete', 1, 11),
  (NULL, 'Flawless', 'Finished with 100% completion', '💎', 'completion', 'completion_rate', 100, 12),

  -- Consistency Achievements
  (NULL, 'Early Bird', 'Logged early 7 times', '🌅', 'consistency', 'early_entries', 7, 13),
  (NULL, 'Night Owl', 'Logged late 7 times', '🌙', 'consistency', 'late_entries', 7, 14)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE challenge_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_achievements ENABLE ROW LEVEL SECURITY;

-- Anyone can view achievement definitions
CREATE POLICY "Anyone can view achievements" ON challenge_achievements
  FOR SELECT USING (true);

-- Challenge creators can manage custom achievements for their challenges
CREATE POLICY "Creators can manage custom achievements" ON challenge_achievements
  FOR ALL USING (
    challenge_id IS NULL  -- Default achievements are read-only
    OR EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_achievements.challenge_id
      AND challenges.creator_id = auth.uid()
    )
  );

-- Users can view their own earned achievements
CREATE POLICY "Users can view earned achievements" ON participant_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenge_participants
      WHERE challenge_participants.id = participant_achievements.participant_id
      AND challenge_participants.user_id = auth.uid()
    )
    OR EXISTS (
      -- Or they're viewing achievements for a public challenge participant
      SELECT 1 FROM challenge_participants cp
      JOIN challenges c ON c.id = cp.challenge_id
      WHERE cp.id = participant_achievements.participant_id
      AND c.is_public = true
    )
  );

-- System can insert earned achievements (via service role)
CREATE POLICY "System can award achievements" ON participant_achievements
  FOR INSERT WITH CHECK (true);

-- Users can update their own notification status
CREATE POLICY "Users can update notification status" ON participant_achievements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM challenge_participants
      WHERE challenge_participants.id = participant_achievements.participant_id
      AND challenge_participants.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTION: Get achievements for a challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION get_challenge_achievements(p_challenge_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  trigger_type VARCHAR(50),
  trigger_value INTEGER,
  is_hidden BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.name,
    ca.description,
    ca.icon,
    ca.category,
    ca.trigger_type,
    ca.trigger_value,
    ca.is_hidden,
    ca.display_order
  FROM challenge_achievements ca
  WHERE ca.challenge_id IS NULL  -- Default achievements
     OR ca.challenge_id = p_challenge_id  -- Custom achievements for this challenge
  ORDER BY ca.display_order, ca.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. HELPER FUNCTION: Get participant's earned achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION get_participant_achievements(p_participant_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  earned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id as achievement_id,
    ca.name,
    ca.description,
    ca.icon,
    ca.category,
    pa.earned_at
  FROM participant_achievements pa
  JOIN challenge_achievements ca ON ca.id = pa.achievement_id
  WHERE pa.participant_id = p_participant_id
  ORDER BY pa.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. HELPER FUNCTION: Get user's total achievement count
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_achievement_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT pa.achievement_id)::INTEGER
    FROM participant_achievements pa
    JOIN challenge_participants cp ON cp.id = pa.participant_id
    WHERE cp.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. HELPER FUNCTION: Get user's recent achievements (for profile)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_recent_achievements(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  achievement_id UUID,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  earned_at TIMESTAMPTZ,
  challenge_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ca.id)
    ca.id as achievement_id,
    ca.name,
    ca.description,
    ca.icon,
    ca.category,
    pa.earned_at,
    c.name as challenge_name
  FROM participant_achievements pa
  JOIN challenge_participants cp ON cp.id = pa.participant_id
  JOIN challenge_achievements ca ON ca.id = pa.achievement_id
  JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = p_user_id
  ORDER BY ca.id, pa.earned_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
