import { getInviteLinkByToken } from '@/app/actions/inviteLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import Link from 'next/link';
import { Users, Calendar, Clock, CheckCircle2, AlertCircle, Infinity } from 'lucide-react';
import InviteLinkJoinButton from '@/components/challenges/InviteLinkJoinButton';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const result = await getInviteLinkByToken(token);

  // Handle error states
  if (!result.success || !result.challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              {result.error || 'This invite link is no longer valid or has expired.'}
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

  const { challenge, link, isAlreadyMember, hasPendingRequest, isAuthenticated } = result;
  const creator = challenge.creator as { id: string; username: string; avatar_url: string | null } | null;
  const metrics = challenge.metrics as Array<{ name: string; type: string }> | null;

  // Format dates
  const startDate = challenge.starts_at ? format(new Date(challenge.starts_at), 'MMM d, yyyy') : null;
  const endDate = challenge.ends_at ? format(new Date(challenge.ends_at), 'MMM d, yyyy') : null;
  const isOngoing = !challenge.ends_at;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm">You&apos;ve been invited to join</p>
        </div>

        {/* Challenge Preview Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{challenge.name}</CardTitle>
                {challenge.description && (
                  <CardDescription className="line-clamp-3">
                    {challenge.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                Private
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Creator */}
            {creator && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback>
                    {creator.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Created by</p>
                  <p className="text-sm text-muted-foreground">@{creator.username}</p>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{challenge.participantCount} participant{challenge.participantCount !== 1 ? 's' : ''}</span>
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
                    <span>{challenge.duration_days} days</span>
                  </>
                )}
              </div>
            </div>

            {/* Tasks/Metrics */}
            {metrics && metrics.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Daily Tasks</p>
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

            {/* Join Mode Indicator */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {link.auto_admit
                    ? 'You can join instantly'
                    : 'Joining requires creator approval'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Section */}
        <Card>
          <CardContent className="pt-6">
            {isAlreadyMember ? (
              // Already a member
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">You&apos;re already in this challenge!</p>
                  <p className="text-sm text-muted-foreground">
                    You joined this challenge previously.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/challenges/${challenge.id}`}>Go to Challenge</Link>
                </Button>
              </div>
            ) : hasPendingRequest ? (
              // Has pending request
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium">Request Pending</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve already requested to join. The creator will review your request soon.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/challenges/browse">Browse Other Challenges</Link>
                </Button>
              </div>
            ) : !isAuthenticated ? (
              // Not logged in
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to join this challenge
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild>
                    <Link href={`/login?redirect=/invite/${token}`}>Log In</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/signup?redirect=/invite/${token}`}>Create Account</Link>
                  </Button>
                </div>
              </div>
            ) : (
              // Ready to join
              <InviteLinkJoinButton
                token={token}
                autoAdmit={link.auto_admit}
                challengeId={challenge.id}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
