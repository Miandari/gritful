import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { joinChallenge } from '@/app/actions/challenges';

export default async function JoinChallengePage({
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

  // Fetch challenge details directly (let RLS handle it)
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (!challenge) {
    redirect('/challenges/join');
  }

  // Get creator profile
  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', challenge.creator_id)
    .single();

  // Check if already participating
  const { data: existingParticipation } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', id)
    .eq('user_id', user.id)
    .single();

  if (existingParticipation) {
    redirect(`/challenges/${id}`);
  }

  // For private challenges, redirect to browse page (they should use Request to Join)
  if (!challenge.is_public) {
    redirect('/challenges/browse');
  }

  // Get participant count
  const { count: participantCount } = await supabase
    .from('challenge_participants')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', id)
    .eq('status', 'active');

  const getChallengeStatus = () => {
    const now = new Date();
    const startDate = new Date(challenge.starts_at);
    const endDate = new Date(challenge.ends_at);

    if (now < startDate) {
      return 'upcoming';
    } else if (now > endDate) {
      return 'ended';
    } else {
      return 'active';
    }
  };

  const status = getChallengeStatus();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Join Challenge</CardTitle>
          <CardDescription>Review the challenge details before joining</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">{challenge.name}</h3>
              {challenge.description && (
                <p className="mt-2 text-gray-600">{challenge.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={challenge.is_public ? 'default' : 'secondary'}>
                {challenge.is_public ? 'Public' : 'Private'}
              </Badge>
              <Badge variant="outline">{challenge.duration_days} days</Badge>
              <Badge variant="outline">{participantCount} participants</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Created by</span>
                <p>{creatorProfile?.username || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Failure Mode</span>
                <p>
                  {challenge.failure_mode === 'strict'
                    ? 'Strict - Reset on miss'
                    : challenge.failure_mode === 'flexible'
                    ? 'Flexible - Continue with gaps'
                    : 'Grace Period'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Start Date</span>
                <p>{format(new Date(challenge.starts_at), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">End Date</span>
                <p>{format(new Date(challenge.ends_at), 'MMMM d, yyyy')}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tasks ({(challenge.metrics as any[])?.length || 0})</h4>
              <div className="space-y-1">
                {(challenge.metrics as any[])?.map((metric: any, index: number) => (
                  <div key={metric.id} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{index + 1}.</span>
                    <span className="text-sm">{metric.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {metric.type}
                    </Badge>
                    {metric.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {status === 'ended' && (
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  This challenge has already ended and cannot be joined.
                </p>
              </div>
            )}

            {status === 'active' && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  This challenge is currently in progress. You'll start tracking from today.
                </p>
              </div>
            )}

            <form
              action={async () => {
                'use server';
                const result = await joinChallenge(id);
                if (result.success) {
                  redirect(`/challenges/${id}`);
                }
              }}
              className="flex gap-2"
            >
              <Button
                type="submit"
                disabled={status === 'ended'}
                className="flex-1"
              >
                Join Challenge
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href="/dashboard">Cancel</a>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}