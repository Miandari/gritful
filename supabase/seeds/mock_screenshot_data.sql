-- ============================================
-- MOCK DATA FOR SCREENSHOTS
-- Challenge: 30-Day Reading Challenge
-- ID: a1382786-ee81-4507-93f5-27e60d51a679
-- Start date: Nov 12th
-- ============================================

-- STEP 1: Create fake auth.users entries
INSERT INTO auth.users (id, instance_id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'mock.sarah@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '60 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'mock.mike@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '45 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'mock.emma@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '30 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'mock.alex@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '25 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'mock.jordan@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '20 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'mock.taylor@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '15 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'mock.casey@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '40 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'mock.jamie@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '35 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'mock.riley@fake.local', 'authenticated', 'authenticated', '', NOW(), NOW() - INTERVAL '28 days', NOW(), '{"provider": "email", "providers": ["email"]}', '{}')
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Create profiles for these users
INSERT INTO profiles (id, username, full_name, avatar_url, bio, location, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'sarahm', 'Sarah Mitchell', NULL, NULL, 'Portland, OR', NOW() - INTERVAL '60 days'),
  ('22222222-2222-2222-2222-222222222222', 'mikechen', 'Mike Chen', NULL, NULL, 'Seattle, WA', NOW() - INTERVAL '45 days'),
  ('33333333-3333-3333-3333-333333333333', 'emmarodriguez', 'Emma Rodriguez', NULL, NULL, 'Austin, TX', NOW() - INTERVAL '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'athompson', 'Alex Thompson', NULL, NULL, 'Denver, CO', NOW() - INTERVAL '25 days'),
  ('55555555-5555-5555-5555-555555555555', 'jkim92', 'Jordan Kim', NULL, NULL, 'San Francisco, CA', NOW() - INTERVAL '20 days'),
  ('66666666-6666-6666-6666-666666666666', 'tpatel', 'Taylor Patel', NULL, NULL, 'Chicago, IL', NOW() - INTERVAL '15 days'),
  ('77777777-7777-7777-7777-777777777777', 'caseyb', 'Casey Brooks', NULL, NULL, 'Boston, MA', NOW() - INTERVAL '40 days'),
  ('88888888-8888-8888-8888-888888888888', 'jamie_s', 'Jamie Santos', NULL, NULL, 'Miami, FL', NOW() - INTERVAL '35 days'),
  ('99999999-9999-9999-9999-999999999999', 'rileymorgan', 'Riley Morgan', NULL, NULL, 'Nashville, TN', NOW() - INTERVAL '28 days')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name;

-- STEP 3: Add them as participants (with varied stats)
INSERT INTO challenge_participants (id, challenge_id, user_id, status, current_streak, longest_streak, total_points, joined_at)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'a1382786-ee81-4507-93f5-27e60d51a679', '11111111-1111-1111-1111-111111111111', 'active', 16, 16, 47, '2024-11-12'),
  ('aaaa2222-2222-2222-2222-222222222222', 'a1382786-ee81-4507-93f5-27e60d51a679', '22222222-2222-2222-2222-222222222222', 'active', 14, 14, 43, '2024-11-12'),
  ('aaaa3333-3333-3333-3333-333333333333', 'a1382786-ee81-4507-93f5-27e60d51a679', '33333333-3333-3333-3333-333333333333', 'active', 12, 14, 38, '2024-11-13'),
  ('aaaa4444-4444-4444-4444-444444444444', 'a1382786-ee81-4507-93f5-27e60d51a679', '44444444-4444-4444-4444-444444444444', 'active', 10, 12, 34, '2024-11-14'),
  ('aaaa5555-5555-5555-5555-555555555555', 'a1382786-ee81-4507-93f5-27e60d51a679', '55555555-5555-5555-5555-555555555555', 'active', 8, 10, 29, '2024-11-14'),
  ('aaaa6666-6666-6666-6666-666666666666', 'a1382786-ee81-4507-93f5-27e60d51a679', '66666666-6666-6666-6666-666666666666', 'active', 7, 9, 24, '2024-11-16'),
  ('aaaa7777-7777-7777-7777-777777777777', 'a1382786-ee81-4507-93f5-27e60d51a679', '77777777-7777-7777-7777-777777777777', 'active', 5, 7, 19, '2024-11-18'),
  ('aaaa8888-8888-8888-8888-888888888888', 'a1382786-ee81-4507-93f5-27e60d51a679', '88888888-8888-8888-8888-888888888888', 'active', 4, 5, 14, '2024-11-22'),
  ('aaaa9999-9999-9999-9999-999999999999', 'a1382786-ee81-4507-93f5-27e60d51a679', '99999999-9999-9999-9999-999999999999', 'active', 3, 3, 9, '2024-11-25')
ON CONFLICT (challenge_id, user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  total_points = EXCLUDED.total_points;

-- STEP 4: Update YOUR participant record to be #1 on leaderboard
UPDATE challenge_participants
SET current_streak = 18, longest_streak = 18, total_points = 52
WHERE challenge_id = 'a1382786-ee81-4507-93f5-27e60d51a679'
  AND user_id NOT IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
  );

-- Verify the leaderboard
SELECT p.full_name, p.username, cp.current_streak, cp.total_points
FROM challenge_participants cp
JOIN profiles p ON p.id = cp.user_id
WHERE cp.challenge_id = 'a1382786-ee81-4507-93f5-27e60d51a679'
ORDER BY cp.total_points DESC;
