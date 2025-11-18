import { createClient } from '@/lib/supabase/server';
import { PostUpdateButton } from '@/components/challenges/PostUpdateButton';
import { UpdatesPageClient } from '@/components/challenges/UpdatesPageClient';
import { getChallengeMessages } from '@/app/actions/challengeMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default async function ChallengeUpdatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  console.log('[Updates Page] Challenge ID:', id);

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[Updates Page] User authenticated:', !!user, 'User ID:', user?.id);

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = `/login?redirect=/challenges/${id}/updates`;
    console.log('[Updates Page] No user found, redirecting to:', redirectUrl);
    redirect(redirectUrl);
  }

  console.log('[Updates Page] User authenticated, loading page');

  // Get challenge details
  const { data: challenge } = await supabase
    .from('challenges')
    .select('creator_id, name')
    .eq('id', id)
    .single();

  const isCreator = challenge?.creator_id === user?.id;

  // Get participant count for email notifications
  let participantCount = 0;
  if (isCreator) {
    const { count } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'active');
    participantCount = count || 0;
  }

  // Get messages
  const messagesResult = await getChallengeMessages({
    challengeId: id,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="space-y-6">
      {/* Post Update Button - Only visible to creators */}
      {isCreator && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Challenge Updates</h2>
            <p className="text-sm text-muted-foreground">
              Share updates and announcements with all participants
            </p>
          </div>
          <PostUpdateButton challengeId={id} participantCount={participantCount} />
        </div>
      )}

      {/* Updates Feed */}
      {messagesResult.messages && messagesResult.messages.length > 0 ? (
        <UpdatesPageClient
          initialMessages={messagesResult.messages}
          challengeId={id}
          currentUserId={user?.id}
          isCreator={isCreator}
          total={messagesResult.total || 0}
          hasMore={messagesResult.hasMore || false}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Updates Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {isCreator
                  ? 'Click "Post Update" above to share your first update with participants!'
                  : 'Check back later for updates from the challenge creator.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
