import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, MoreVertical, Users } from 'lucide-react';
import Link from 'next/link';
import DeleteChallengeButton from '@/components/challenges/DeleteChallengeButton';
import LeaveChallengeButton from '@/components/challenges/LeaveChallengeButton';
import JoinChallengeButton from '@/components/challenges/JoinChallengeButton';
import { ChallengeTabs } from '@/components/challenges/ChallengeTabs';

export default async function ChallengeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[Challenge Layout] User authenticated:', !!user, 'Challenge ID:', id);

  // Fetch challenge details
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  console.log('[Challenge Layout] Challenge fetch result:', {
    hasChallenge: !!challenge,
    errorCode: challengeError?.code,
    errorMessage: challengeError?.message,
  });

  // IMPORTANT: PGRST116 means "0 rows returned" which can happen because:
  // 1. Challenge doesn't exist, OR
  // 2. RLS blocked access for unauthenticated users
  // We need to differentiate between these cases!

  if (challengeError?.code === 'PGRST116') {
    if (!user) {
      // No user + no rows = RLS is blocking, render minimal layout and let page handle auth
      console.log('[Challenge Layout] RLS blocking unauthenticated user, rendering minimal layout');
      return <div className="min-h-screen bg-background">{children}</div>;
    } else {
      // Has user + no rows = challenge truly doesn't exist
      console.error('[Challenge Layout] Challenge not found for authenticated user:', id);
      notFound();
    }
  }

  // Handle other errors
  if (challengeError || !challenge) {
    console.error('[Challenge Layout] Unexpected error:', challengeError);
    notFound();
  }

  // Check if current user is participant
  let isParticipant = false;
  let participantCount = 0;
  let joinRequest: any = null;

  if (user) {
    const { data: participation } = await supabase
      .from('challenge_participants')
      .select('id, status')
      .eq('challenge_id', id)
      .eq('user_id', user.id)
      .single();

    isParticipant = !!participation;

    // Check for pending join request if not participant
    if (!isParticipant && user.id !== challenge.creator_id) {
      const { data: request } = await supabase
        .from('challenge_join_requests')
        .select('id, status')
        .eq('challenge_id', id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .single();

      joinRequest = request;
    }
  }

  const isCreator = challenge.creator_id === user?.id;

  // Get participant count
  if (challenge.is_public || isCreator) {
    const { count } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', id)
      .eq('status', 'active');

    participantCount = count || 0;
  }

  // Get unread count for Updates tab badge
  let unreadCount = 0;
  if (user && isParticipant) {
    const { data: unreadData } = await supabase.rpc('get_unread_message_count', {
      p_challenge_id: id,
      p_user_id: user.id,
    });
    unreadCount = unreadData || 0;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Challenge Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{challenge.name}</h1>
              {challenge.description && (
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">{challenge.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={challenge.is_public ? 'default' : 'secondary'}>
                  {challenge.is_public ? 'Public' : 'Private'}
                </Badge>
                <Badge variant="outline">{challenge.duration_days} days</Badge>
                {isCreator && <Badge variant="secondary">You created this</Badge>}
                {isParticipant && !isCreator && <Badge variant="secondary">Participating</Badge>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:flex-wrap">
              {!isParticipant && user && !isCreator && (
                <JoinChallengeButton
                  challengeId={id}
                  isPublic={challenge.is_public}
                  hasPendingRequest={!!joinRequest}
                  requestStatus={joinRequest?.status}
                />
              )}
              {isParticipant && (
                <>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/dashboard/today">Track Today</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto sm:size-9 sm:px-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sm:hidden ml-2">More Options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isCreator && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/challenges/${id}/participants`} className="cursor-pointer">
                              <Users className="mr-2 h-4 w-4" />
                              Manage Participants
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/challenges/${id}/edit`} className="cursor-pointer">
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <div className="w-full">
                              <DeleteChallengeButton
                                challengeId={challenge.id}
                                challengeName={challenge.name}
                              />
                            </div>
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isCreator && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <div className="w-full">
                              <LeaveChallengeButton
                                challengeId={challenge.id}
                                challengeName={challenge.name}
                              />
                            </div>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {isCreator && !isParticipant && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto sm:size-9 sm:px-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sm:hidden ml-2">More Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/challenges/${id}/participants`} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Participants
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/challenges/${id}/edit`} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <DeleteChallengeButton
                          challengeId={challenge.id}
                          challengeName={challenge.name}
                        />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <ChallengeTabs
          challengeId={id}
          participantCount={participantCount}
          unreadCount={unreadCount}
          isParticipant={isParticipant}
        >
          {children}
        </ChallengeTabs>
      </div>
    </div>
  );
}
