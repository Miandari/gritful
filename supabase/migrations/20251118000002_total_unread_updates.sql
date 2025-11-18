-- Function to get total unread message count across all challenges for a user
CREATE OR REPLACE FUNCTION get_total_unread_updates(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_unread INTEGER := 0;
  participant_record RECORD;
BEGIN
  -- Loop through all active challenge participations
  FOR participant_record IN
    SELECT challenge_id, last_message_read_at
    FROM challenge_participants
    WHERE user_id = p_user_id
      AND status = 'active'
  LOOP
    -- Count messages created after last_read timestamp for each challenge
    SELECT total_unread + COUNT(*) INTO total_unread
    FROM challenge_messages
    WHERE challenge_id = participant_record.challenge_id
      AND created_at > participant_record.last_message_read_at;
  END LOOP;

  RETURN total_unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_total_unread_updates(UUID) TO authenticated;
