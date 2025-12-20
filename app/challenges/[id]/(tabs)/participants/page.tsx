import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import RemoveParticipantButton from '@/components/challenges/RemoveParticipantButton';

export const revalidate = 0;

export default async function ParticipantsManagementPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (!challenge) {
    notFound();
  }

  // Verify user is the creator
  if (challenge.creator_id !== user.id) {
    redirect(`/challenges/${id}`);
  }

  // Fetch all participants
  const { data: participants, error: participantsError } = await supabase
    .from('challenge_participants')
    .select('id, user_id, joined_at, status, current_streak, total_points')
    .eq('challenge_id', id)
    .order('joined_at', { ascending: true });

  console.log('Participants query:', {
    challengeId: id,
    participants,
    participantsError,
    count: participants?.length || 0
  });

  // Fetch profiles
  const userIds = participants?.map(p => p.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  const participantsWithProfiles = participants?.map(p => ({
    ...p,
    profile: profileMap.get(p.user_id),
    isCreator: p.user_id === challenge.creator_id,
  })) || [];

  // Fetch pending join requests for private challenges
  let pendingRequestsCount = 0;
  if (!challenge.is_public) {
    const { count } = await supabase
      .from('challenge_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'pending');
    pendingRequestsCount = count || 0;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href={`/challenges/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Challenge
            </Link>
          </Button>

          <h1 className="text-3xl font-bold text-foreground">Manage Participants</h1>
          <p className="mt-2 text-gray-600">{challenge.name}</p>
        </div>

        {/* Pending Join Requests Section - for private challenges */}
        {!challenge.is_public && (
          <Card className={`mb-6 ${pendingRequestsCount > 0 ? 'border-amber-500 dark:border-amber-400' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Pending Join Requests</CardTitle>
                </div>
                {pendingRequestsCount > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {pendingRequestsCount} pending
                  </Badge>
                )}
              </div>
              <CardDescription>
                {pendingRequestsCount > 0
                  ? `${pendingRequestsCount} ${pendingRequestsCount === 1 ? 'person is' : 'people are'} waiting to join`
                  : 'No pending requests at the moment'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant={pendingRequestsCount > 0 ? 'default' : 'outline'}>
                <Link href="/challenges/requests">
                  {pendingRequestsCount > 0 ? 'Review Requests' : 'View Request History'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Participants ({participantsWithProfiles.length})</CardTitle>
            <CardDescription>
              View and manage who can participate in this challenge
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participantsWithProfiles.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No participants yet</p>
            ) : (
              <div className="space-y-3">
                {participantsWithProfiles.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between border rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {participant.profile?.username || 'Unknown User'}
                        </span>
                        {participant.isCreator && (
                          <Badge variant="secondary" className="text-xs">Creator</Badge>
                        )}
                        <Badge
                          variant={participant.status === 'active' ? 'default' : 'outline'}
                          className="text-xs capitalize"
                        >
                          {participant.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Joined {format(new Date(participant.joined_at), 'MMM d, yyyy')}</span>
                        <span>Streak: {participant.current_streak} days</span>
                        <span>Points: {participant.total_points || 0}</span>
                      </div>
                    </div>

                    {!participant.isCreator && (
                      <RemoveParticipantButton
                        participantId={participant.id}
                        participantName={participant.profile?.username || 'this user'}
                        challengeId={id}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
