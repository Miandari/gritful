import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function UpdatesPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all active challenge participations with unread counts
  const { data: participations } = await supabase
    .from('challenge_participants')
    .select(`
      challenge_id,
      last_message_read_at,
      challenges (
        id,
        name,
        description
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Calculate unread count for each challenge
  const challengesWithUnread = await Promise.all(
    (participations || []).map(async (participation) => {
      const { data: unreadCount } = await supabase.rpc('get_unread_message_count', {
        p_challenge_id: participation.challenge_id,
        p_user_id: user.id,
      });

      return {
        challenge: participation.challenges,
        unreadCount: unreadCount || 0,
      };
    })
  );

  // Filter to only challenges with unread messages
  const unreadChallenges = challengesWithUnread.filter((c) => c.unreadCount > 0);

  // Get total count
  const { data: totalUnread } = await supabase.rpc('get_total_unread_updates', {
    p_user_id: user.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Updates</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            {totalUnread === 0
              ? "You're all caught up!"
              : `You have ${totalUnread} unread update${totalUnread !== 1 ? 's' : ''}`}
          </p>
        </div>

        {unreadChallenges.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Unread Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">All caught up!</p>
                <p className="text-sm">
                  Check back later for new updates from your challenges.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {unreadChallenges.map(({ challenge, unreadCount }) => (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}/updates`}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {challenge.name}
                          </h3>
                          <Badge variant="destructive">
                            {unreadCount} new
                          </Badge>
                        </div>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {challenge.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
