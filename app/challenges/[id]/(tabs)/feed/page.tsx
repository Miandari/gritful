import { createClient } from '@/lib/supabase/server';
import { FeedPageClient } from '@/components/feed/FeedPageClient';
import { getActivityFeed } from '@/app/actions/activityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default async function ChallengeFeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect(`/login?redirect=/challenges/${id}/feed`);
  }

  // Get challenge details
  const { data: challenge } = await supabase
    .from('challenges')
    .select('creator_id, name')
    .eq('id', id)
    .single();

  const isCreator = challenge?.creator_id === user?.id;

  // Check if user is participant
  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('id, status')
    .eq('challenge_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isParticipant = !!participant;

  // Get activity feed
  const feedResult = await getActivityFeed({
    challengeId: id,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Activity Feed</h2>
          <p className="text-sm text-muted-foreground">
            See what everyone is up to in this challenge
          </p>
        </div>
      </div>

      {/* Activity Feed */}
      {feedResult.activities && feedResult.activities.length > 0 ? (
        <FeedPageClient
          initialActivities={feedResult.activities}
          challengeId={id}
          currentUserId={user.id}
          isCreator={isCreator}
          isParticipant={isParticipant}
          total={feedResult.total || 0}
          hasMore={feedResult.hasMore || false}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Activity Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {isParticipant
                  ? 'Start completing your daily entries to see them appear here!'
                  : 'Activity from challenge participants will appear here once they start logging entries.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
