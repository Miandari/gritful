-- =====================================================
-- EMAIL NOTIFICATION ON JOIN REQUEST
-- Extends the join request trigger to also queue an email
-- if the challenge creator has opted in (email_join_requests)
-- =====================================================

-- Replace the existing trigger function to add email queueing
CREATE OR REPLACE FUNCTION public.notify_creator_of_join_request()
RETURNS TRIGGER AS $$
DECLARE
    challenge_name TEXT;
    challenge_creator UUID;
    requester_username TEXT;
    creator_username TEXT;
    creator_email TEXT;
    should_send_email BOOLEAN;
BEGIN
    -- Get challenge details
    SELECT name, creator_id INTO challenge_name, challenge_creator
    FROM public.challenges
    WHERE id = NEW.challenge_id;

    -- Get requester username
    SELECT username INTO requester_username
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Create in-app notification for challenge creator
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        challenge_creator,
        'join_request',
        'New join request',
        COALESCE(requester_username, 'Someone') || ' wants to join "' || challenge_name || '"',
        jsonb_build_object(
            'challenge_id', NEW.challenge_id,
            'request_id', NEW.id,
            'requester_id', NEW.user_id,
            'requester_username', COALESCE(requester_username, 'Unknown')
        )
    );

    -- Check if creator wants email notifications for join requests
    SELECT email_join_requests INTO should_send_email
    FROM public.user_preferences
    WHERE user_id = challenge_creator;

    -- If preference not set, default to false
    IF should_send_email IS NULL THEN
        should_send_email := false;
    END IF;

    -- Queue email if creator has opted in
    IF should_send_email THEN
        -- Get creator's email
        SELECT email INTO creator_email
        FROM auth.users
        WHERE id = challenge_creator;

        -- Get creator's username
        SELECT username INTO creator_username
        FROM public.profiles
        WHERE id = challenge_creator;

        -- Insert into email queue
        INSERT INTO public.email_queue (
            user_id,
            email_type,
            recipient_email,
            subject,
            template_name,
            template_data,
            scheduled_for
        ) VALUES (
            challenge_creator,
            'join_request',
            creator_email,
            'New join request for "' || challenge_name || '"',
            'join_request',
            jsonb_build_object(
                'creator_username', COALESCE(creator_username, 'there'),
                'requester_username', COALESCE(requester_username, 'Someone'),
                'challenge_name', challenge_name,
                'challenge_id', NEW.challenge_id,
                'request_id', NEW.id,
                'approve_url', 'https://www.gritful.app/challenges/requests'
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger itself doesn't need to be recreated as it already exists
-- and references this function by name
