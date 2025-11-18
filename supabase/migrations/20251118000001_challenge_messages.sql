-- Challenge Messages Table
-- Stores all messages/updates posted in challenges (both email and in-app)
CREATE TABLE IF NOT EXISTS challenge_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  sent_via_email BOOLEAN DEFAULT false,
  recipient_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES challenge_messages(id) ON DELETE SET NULL
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_challenge_messages_challenge
  ON challenge_messages(challenge_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_messages_sender
  ON challenge_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_challenge_messages_parent
  ON challenge_messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;

-- Add last_message_read_at column to challenge_participants for read tracking
ALTER TABLE challenge_participants
ADD COLUMN IF NOT EXISTS last_message_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- RLS Policies for challenge_messages
ALTER TABLE challenge_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone with access to a challenge can read its messages
CREATE POLICY "Users can read messages from their challenges"
  ON challenge_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_challenge_access
      WHERE user_challenge_access.user_id = auth.uid()
        AND user_challenge_access.challenge_id = challenge_messages.challenge_id
    )
  );

-- Policy: Challenge creators and admins can post messages
CREATE POLICY "Challenge creators can post messages"
  ON challenge_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_messages.challenge_id
        AND challenges.creator_id = auth.uid()
    )
  );

-- Policy: Message authors can update their own messages (for editing)
CREATE POLICY "Message authors can update their messages"
  ON challenge_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Policy: Challenge creators can update any message (for pinning/moderation)
CREATE POLICY "Challenge creators can update any message"
  ON challenge_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_messages.challenge_id
        AND challenges.creator_id = auth.uid()
    )
  );

-- Policy: Message authors can delete their own messages
CREATE POLICY "Message authors can delete their messages"
  ON challenge_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- Policy: Challenge creators can delete any message (for moderation)
CREATE POLICY "Challenge creators can delete any message"
  ON challenge_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_messages.challenge_id
        AND challenges.creator_id = auth.uid()
    )
  );

-- Function to get unread message count for a participant
CREATE OR REPLACE FUNCTION get_unread_message_count(p_challenge_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the last_message_read_at timestamp for this participant
  SELECT last_message_read_at INTO last_read
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id
    AND user_id = p_user_id;

  -- If no record found, return 0
  IF last_read IS NULL THEN
    RETURN 0;
  END IF;

  -- Count messages created after last_read timestamp
  SELECT COUNT(*) INTO unread_count
  FROM challenge_messages
  WHERE challenge_id = p_challenge_id
    AND created_at > last_read;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID, UUID) TO authenticated;
