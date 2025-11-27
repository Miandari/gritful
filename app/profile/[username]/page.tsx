import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, Target, MapPin, Globe, Twitter, Github, Instagram, Award } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CompactAchievementGrid } from '@/components/achievements/AchievementGrid';
import type { AchievementWithProgress, AchievementCategory } from '@/lib/achievements/types';

export default async function PublicProfilePage({
  params
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Get current user (to check if viewing own profile)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch profile by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // If viewing own profile, redirect to /profile
  if (currentUser?.id === profile.id) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">This is your profile.</p>
              <Button asChild>
                <Link href="/profile">Go to Your Profile Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Note: Email display removed for now. If users want to share their email,
  // they can add it to their bio or we can add an email field to the profiles table.
  // Getting email from auth.users requires service role access which is not appropriate
  // for a public profile page.

  // Workaround for Supabase foreign key detection issue (see CLAUDE.md)
  // Fetch participations and challenges separately, then join in code

  // 1. Fetch ALL participations for this user (public + private for aggregate stats)
  const { data: allParticipations } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, current_streak, longest_streak, total_points, joined_at, status')
    .eq('user_id', profile.id)
    .eq('status', 'active');

  // 2. Fetch all public challenges
  const { data: publicChallenges } = await supabase
    .from('challenges')
    .select('id, name, is_public, starts_at, ends_at, duration_days')
    .eq('is_public', true);

  // 3. Join in application code - only keep participations for public challenges (for display)
  const publicParticipations = allParticipations
    ?.map(participation => {
      const challenge = publicChallenges?.find(c => c.id === participation.challenge_id);
      if (!challenge) return null;
      return {
        ...participation,
        challenges: challenge
      };
    })
    .filter(p => p !== null) || [];

  // Count private participations
  const privateParticipationsCount = (allParticipations?.length || 0) - publicParticipations.length;

  // Fetch ALL challenges created by this user (for count)
  const { data: allCreatedChallenges } = await supabase
    .from('challenges')
    .select('id, name, starts_at, ends_at, duration_days, is_public, created_at')
    .eq('creator_id', profile.id)
    .order('created_at', { ascending: false });

  // Separate into public/private for display
  const publicCreatedChallenges = allCreatedChallenges?.filter(c => c.is_public) || [];
  const privateCreatedCount = (allCreatedChallenges?.length || 0) - publicCreatedChallenges.length;

  // Calculate stats from ALL participations (privacy-safe aggregate data)
  const totalPoints = allParticipations?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;
  const activeChallenges = allParticipations?.length || 0;
  const challengesCreated = allCreatedChallenges?.length || 0;
  const longestStreak = allParticipations?.reduce((max, p) => Math.max(max, p.longest_streak || 0), 0) || 0;

  // Fetch user's recent achievements (across all challenges)
  const { data: recentAchievements } = await supabase.rpc('get_user_recent_achievements', {
    p_user_id: profile.id,
    p_limit: 10,
  });

  // Get total achievement count
  const { data: achievementCount } = await supabase.rpc('get_user_achievement_count', {
    p_user_id: profile.id,
  });

  // Transform to AchievementWithProgress format
  const achievementsForDisplay: AchievementWithProgress[] = (recentAchievements || []).map((a: {
    achievement_id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    earned_at: string;
    challenge_name: string;
  }) => ({
    id: a.achievement_id,
    challenge_id: null,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category as AchievementCategory,
    trigger_type: 'streak_days' as const,
    trigger_value: 0,
    is_hidden: false,
    display_order: 0,
    created_at: '',
    earned: true,
    earned_at: a.earned_at,
    challenge_name: a.challenge_name,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || 'User avatar'}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {(profile.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {profile.username || 'Unknown User'}
                </h1>
                {profile.full_name && (
                  <p className="text-lg text-muted-foreground mb-2">{profile.full_name}</p>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                {/* Contact & Social Links */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {profile.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  )}
                  {profile.twitter_handle && (
                    <a
                      href={`https://twitter.com/${profile.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      @{profile.twitter_handle}
                    </a>
                  )}
                  {profile.github_handle && (
                    <a
                      href={`https://github.com/${profile.github_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      {profile.github_handle}
                    </a>
                  )}
                  {profile.instagram_handle && (
                    <a
                      href={`https://instagram.com/${profile.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      @{profile.instagram_handle}
                    </a>
                  )}
                </div>

                {/* Member Since */}
                <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-muted-foreground">Total Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{activeChallenges}</div>
              <div className="text-xs text-muted-foreground">Active Challenges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">Longest Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold">{achievementCount || 0}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">{challengesCreated}</div>
              <div className="text-xs text-muted-foreground">Created</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Achievements */}
        {achievementsForDisplay.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
              <CardDescription>
                {achievementCount || 0} total badges earned across all challenges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompactAchievementGrid
                achievements={achievementsForDisplay}
                maxDisplay={8}
                size="md"
              />
            </CardContent>
          </Card>
        )}

        {/* Active Challenges */}
        {publicParticipations && publicParticipations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
              <CardDescription>Public challenges {profile.username} is participating in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {publicParticipations.map((participation: any) => (
                  <Link
                    key={participation.id}
                    href={`/challenges/${participation.challenges.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium">{participation.challenges.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{participation.challenges.duration_days} days</span>
                          <span>Current streak: {participation.current_streak}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{participation.total_points || 0}</div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  </Link>
                ))}
                {privateParticipationsCount > 0 && (
                  <div className="p-3 rounded-lg border border-dashed bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">
                      Also participating in {privateParticipationsCount} private {privateParticipationsCount === 1 ? 'challenge' : 'challenges'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* If only private participations */}
        {publicParticipations.length === 0 && privateParticipationsCount > 0 && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {profile.username} is participating in {privateParticipationsCount} private {privateParticipationsCount === 1 ? 'challenge' : 'challenges'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Created Challenges */}
        {publicCreatedChallenges && publicCreatedChallenges.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Created Challenges</CardTitle>
              <CardDescription>Public challenges created by {profile.username}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {publicCreatedChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium">{challenge.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{challenge.duration_days} days</span>
                          <span>Started {format(new Date(challenge.starts_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <Badge variant="secondary">Creator</Badge>
                    </div>
                  </Link>
                ))}
                {privateCreatedCount > 0 && (
                  <div className="p-3 rounded-lg border border-dashed bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">
                      Also created {privateCreatedCount} private {privateCreatedCount === 1 ? 'challenge' : 'challenges'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* If only private created challenges */}
        {publicCreatedChallenges.length === 0 && privateCreatedCount > 0 && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {profile.username} has created {privateCreatedCount} private {privateCreatedCount === 1 ? 'challenge' : 'challenges'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty State - No challenges at all */}
        {activeChallenges === 0 && challengesCreated === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {profile.username} hasn&apos;t participated in or created any challenges yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
