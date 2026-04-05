import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import JoinRequestActions from '@/components/challenges/JoinRequestActions';
import MarkNotificationsRead from '@/components/notifications/MarkNotificationsRead';
import { BackButton } from '@/components/shared/BackButton';

export default async function JoinRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all challenges created by the user
  const { data: myChallenges } = await supabase
    .from('challenges')
    .select('id, name')
    .eq('creator_id', user.id);

  const challengeIds = myChallenges?.map(c => c.id) || [];

  if (challengeIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-foreground">Join Requests</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">You haven't created any challenges yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all pending join requests for those challenges
  const { data: joinRequests } = await supabase
    .from('challenge_join_requests')
    .select('id, challenge_id, user_id, status, message, created_at')
    .in('challenge_id', challengeIds)
    .order('created_at', { ascending: false });

  // Fetch user profiles for requesters
  const userIds = joinRequests?.map(r => r.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const challengeMap = new Map(myChallenges?.map(c => [c.id, c]) || []);

  // Merge data
  const requestsWithData = joinRequests?.map(request => ({
    ...request,
    profile: profileMap.get(request.user_id),
    challenge: challengeMap.get(request.challenge_id),
  })) || [];

  const pendingRequests = requestsWithData.filter(r => r.status === 'pending');
  const reviewedRequests = requestsWithData.filter(r => r.status !== 'pending');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Mark all notifications as read when viewing this page */}
      <MarkNotificationsRead />

      <div className="flex items-center gap-3 mb-2">
        <BackButton />
        <h1 className="text-3xl font-bold text-foreground">Join Requests</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Manage requests to join your private challenges
      </p>

      {/* Pending Requests */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} awaiting your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {request.profile?.username || 'Unknown User'}
                      </span>
                      <span className="text-gray-600">wants to join</span>
                      <span className="font-medium">{request.challenge?.name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Requested {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-700 mt-2 italic">"{request.message}"</p>
                    )}
                  </div>

                  <JoinRequestActions requestId={request.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>Previously reviewed requests</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewedRequests.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No reviewed requests yet</p>
          ) : (
            <div className="space-y-3">
              {reviewedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {request.profile?.username || 'Unknown User'}
                      </span>
                      <span className="text-gray-600">requested to join</span>
                      <span className="font-medium">{request.challenge?.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <Badge
                    variant={request.status === 'approved' ? 'default' : 'destructive'}
                    className="capitalize"
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
