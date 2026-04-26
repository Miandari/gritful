import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { joinChallenge } from '@/app/actions/challenges';
import { getChallengePreview } from '@/app/actions/challengePreview';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { Users, Calendar, Clock, Infinity, AlertCircle } from 'lucide-react';

const getCachedPreview = unstable_cache(
  getChallengePreview,
  ['challenge-preview'],
  { revalidate: 300 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const preview = await getCachedPreview(id);
    if (!preview) return { title: 'Gritful' };
    const desc =
      preview.description ||
      `A ${preview.duration_days ? preview.duration_days + '-day' : 'ongoing'} challenge with ${preview.participantCount} participants`;
    return {
      title: `Join "${preview.name}" on Gritful`,
      description: desc,
      openGraph: {
        title: `Join "${preview.name}" on Gritful`,
        description: desc,
        url: `https://www.gritful.app/challenges/${id}/join`,
        siteName: 'Gritful',
        type: 'website' as const,
      },
    };
  } catch {
    return { title: 'Gritful' };
  }
}

export default async function JoinChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Authenticated flow (existing behavior) ──
  if (user) {
    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single() as any;

    if (!challenge) {
      redirect('/challenges/join');
    }

    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', challenge.creator_id)
      .single() as any;

    const { data: existingParticipation } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingParticipation) {
      redirect(`/challenges/${id}`);
    }

    if (!challenge.is_public) {
      redirect('/challenges/browse');
    }

    const { count: participantCount } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'active');

    const getChallengeStatus = () => {
      const now = new Date();
      const startDate = new Date(challenge.starts_at);
      const endDate = challenge.ends_at ? new Date(challenge.ends_at) : null;

      if (now < startDate) return 'upcoming';
      if (endDate && now > endDate) return 'ended';
      return 'active';
    };

    const status = getChallengeStatus();

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Join Challenge</CardTitle>
            <CardDescription>
              Review the challenge details before joining
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">{challenge.name}</h3>
                {challenge.description && (
                  <p className="mt-2 text-muted-foreground">
                    {challenge.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Public</Badge>
                {challenge.ends_at ? (
                  <Badge variant="outline">
                    {challenge.duration_days} days
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Infinity className="h-3 w-3" />
                    Ongoing
                  </Badge>
                )}
                <Badge variant="outline">
                  {participantCount} participants
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Created by
                  </span>
                  <p>{creatorProfile?.username || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Failure Mode
                  </span>
                  <p>
                    {challenge.failure_mode === 'strict'
                      ? 'Strict - Reset on miss'
                      : challenge.failure_mode === 'flexible'
                        ? 'Flexible - Continue with gaps'
                        : 'Grace Period'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </span>
                  <p>
                    {format(new Date(challenge.starts_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    End Date
                  </span>
                  {challenge.ends_at ? (
                    <p>
                      {format(new Date(challenge.ends_at), 'MMMM d, yyyy')}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1">
                      <Infinity className="h-4 w-4" />
                      Ongoing
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">
                  Tasks ({(challenge.metrics as any[])?.length || 0})
                </h4>
                <div className="space-y-1">
                  {(challenge.metrics as any[])?.map(
                    (metric: any, index: number) => (
                      <div key={metric.id} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {index + 1}.
                        </span>
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
                    )
                  )}
                </div>
              </div>

              {status === 'ended' && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This challenge has already ended and cannot be joined.
                  </p>
                </div>
              )}

              {status === 'active' && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This challenge is currently in progress. You&apos;ll start
                    tracking from today.
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

  // ── Unauthenticated flow: show preview ──
  let preview;
  try {
    preview = await getCachedPreview(id);
  } catch {
    // Network/DB error
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              We couldn&apos;t load this challenge. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // null = not found or private (indistinguishable, RLS-enforced)
  if (!preview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Challenge Not Found</CardTitle>
            <CardDescription>
              This challenge doesn&apos;t exist or is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild variant="default">
              <Link href="/challenges/browse">Browse Public Challenges</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = preview.metrics as Array<{
    name: string;
    type: string;
  }> | null;
  const startDate = preview.starts_at
    ? format(new Date(preview.starts_at), 'MMM d, yyyy')
    : null;
  const isOngoing = !preview.ends_at;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited to join
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl mb-2">{preview.name}</CardTitle>
            {preview.description && (
              <CardDescription className="line-clamp-3">
                {preview.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {preview.creator && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={preview.creator.avatar_url || undefined}
                  />
                  <AvatarFallback>
                    {preview.creator.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Created by</p>
                  <p className="text-sm text-muted-foreground">
                    @{preview.creator.username}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {preview.participantCount} participant
                  {preview.participantCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{startDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {isOngoing ? (
                  <>
                    <Infinity className="h-4 w-4" />
                    <span>Ongoing</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>{preview.duration_days} days</span>
                  </>
                )}
              </div>
            </div>

            {metrics && metrics.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tasks</p>
                <div className="flex flex-wrap gap-2">
                  {metrics.slice(0, 5).map((metric, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {metric.name}
                    </Badge>
                  ))}
                  {metrics.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{metrics.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to join this challenge
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild>
                  <Link href={`/login?redirect=/challenges/${id}/join`}>
                    Log In
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/signup?redirect=/challenges/${id}/join`}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
