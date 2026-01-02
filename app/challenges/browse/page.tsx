import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BrowseChallengeCard } from '@/components/challenges/BrowseChallengeCard';

export default async function BrowseChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all challenges (public and private)
  let query = supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  // Add search filter if provided
  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  const { data: challenges } = await query;

  // Fetch creator profiles separately
  const creatorIds = challenges?.map(c => c.creator_id) || [];
  const { data: creators } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', creatorIds);

  const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

  // Get participant counts and join request status for each challenge
  const challengesWithCounts = await Promise.all(
    (challenges || []).map(async (challenge) => {
      // Count participants
      const { count } = await supabase
        .from('challenge_participants')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id)
        .eq('status', 'active');

      // Check if current user is participating
      let isParticipating = false;
      let hasRequestedToJoin = false;
      let requestStatus = null;

      if (user) {
        const { data: participation } = await supabase
          .from('challenge_participants')
          .select('id')
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.id)
          .single();

        isParticipating = !!participation;

        // Check for existing join request if not participating
        if (!isParticipating && !challenge.is_public) {
          const { data: joinRequest } = await supabase
            .from('challenge_join_requests')
            .select('status')
            .eq('challenge_id', challenge.id)
            .eq('user_id', user.id)
            .single();

          if (joinRequest) {
            hasRequestedToJoin = true;
            requestStatus = joinRequest.status;
          }
        }
      }

      return {
        ...challenge,
        creator: creatorMap.get(challenge.creator_id),
        participantCount: count || 0,
        isParticipating,
        hasRequestedToJoin,
        requestStatus,
      };
    })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Browse Challenges</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Discover public and private challenges
        </p>

        {/* Search bar */}
        <form className="mt-6 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search challenges..."
              defaultValue={params?.search}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="sm:px-4 px-3">
            <span className="hidden sm:inline">Search</span>
            <Search className="h-4 w-4 sm:hidden" />
          </Button>
        </form>
      </div>

      {challenges && challenges.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No public challenges found</p>
            <Button asChild className="mt-4">
              <Link href="/challenges/create">Create the First Challenge</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {challengesWithCounts.map((challenge: any) => (
          <BrowseChallengeCard
            key={challenge.id}
            challenge={{
              id: challenge.id,
              name: challenge.name,
              description: challenge.description,
              starts_at: challenge.starts_at,
              ends_at: challenge.ends_at,
              duration_days: challenge.duration_days,
              creator_id: challenge.creator_id,
              is_public: challenge.is_public,
              metrics: challenge.metrics || [],
              creator: challenge.creator,
              participantCount: challenge.participantCount,
              isParticipating: challenge.isParticipating,
              hasRequestedToJoin: challenge.hasRequestedToJoin,
              requestStatus: challenge.requestStatus,
            }}
            currentUserId={user?.id || null}
          />
        ))}
      </div>
    </div>
  );
}