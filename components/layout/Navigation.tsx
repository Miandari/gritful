'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Defer non-critical work until after first paint. Only called from an
// effect so no SSR guard needed.
const runWhenIdle = (fn: () => void) => {
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
};

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);

  // Holds the set of challenge IDs the current user participates in.
  // The messages-channel callback reads this to filter out INSERT events
  // for unrelated challenges (the Supabase realtime subscription itself
  // has no server-side filter on challenge_messages).
  const participationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const channels: RealtimeChannel[] = [];

    // Fetch profile data including avatar
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (!cancelled) setProfile(data);
    };

    // Fetch combined unread count (challenge messages + notifications).
    // Runs both sub-queries in parallel.
    const fetchUnreadCount = async () => {
      const [messagesResult, notificationsResult] = await Promise.all([
        supabase.rpc('get_total_unread_updates', { p_user_id: user.id }),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
      ]);

      if (messagesResult.error) {
        console.error('Error fetching unread messages count:', messagesResult.error);
      }
      if (notificationsResult.error) {
        console.error('Error fetching unread notifications count:', notificationsResult.error);
      }

      if (!cancelled) {
        setUnreadCount((messagesResult.data || 0) + (notificationsResult.count || 0));
      }
    };

    // Load the set of challenges this user is currently active in, so the
    // messages-channel callback can filter unrelated events.
    const fetchParticipations = async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!cancelled) {
        participationIdsRef.current = new Set(
          (data ?? []).map((p: { challenge_id: string }) => p.challenge_id)
        );
      }
    };

    // Fire off the three initial fetches concurrently, then defer all
    // realtime subscription setup until the browser is idle. This keeps
    // the navigation bar from contending for main-thread time during
    // first paint.
    (async () => {
      await Promise.all([fetchProfile(), fetchUnreadCount(), fetchParticipations()]);
      if (cancelled) return;

      runWhenIdle(() => {
        if (cancelled) return;

        // Subscribe to profile changes (avatar updates)
        const profileChannel = supabase
          .channel('profile-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            () => {
              fetchProfile();
            }
          )
          .subscribe();

        // Subscribe to new challenge messages. Can't express an "IN
        // (user's challenges)" filter at the Supabase realtime layer
        // reliably, so we subscribe globally and guard in the handler
        // against the user's participation set.
        const messagesChannel = supabase
          .channel('challenge-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'challenge_messages',
            },
            (payload) => {
              const challengeId = (payload.new as { challenge_id?: string })?.challenge_id;
              if (challengeId && participationIdsRef.current.has(challengeId)) {
                fetchUnreadCount();
              }
            }
          )
          .subscribe();

        // Subscribe to challenge_participants updates (when messages are
        // marked as read)
        const participantsChannel = supabase
          .channel('challenge-participants-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'challenge_participants',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchUnreadCount();
            }
          )
          .subscribe();

        // Subscribe to notifications changes (new notifications or marked
        // as read)
        const notificationsChannel = supabase
          .channel('notifications-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchUnreadCount();
            }
          )
          .subscribe();

        channels.push(
          profileChannel,
          messagesChannel,
          participantsChannel,
          notificationsChannel
        );
      });
    })();

    return () => {
      cancelled = true;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user, supabase]);

  const handleLogout = async () => {
    // Clean up push subscription before signing out
    try {
      const { cleanupPushOnLogout } = await import('@/components/shared/PushNotificationManager');
      await cleanupPushOnLogout();
    } catch {}
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/today', label: 'Today' },
    { href: '/dashboard/challenges', label: 'Challenges' },
    { href: '/challenges/browse', label: 'Browse' },
    { href: '/challenges/create', label: 'Create' },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              Gritful
            </Link>
            <div className="hidden space-x-4 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications Bell */}
                <Link href="/notifications" className="relative">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage
                          src={profile?.avatar_url || undefined}
                          alt={profile?.username || user.email || 'User'}
                        />
                        <AvatarFallback>
                          {(profile?.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {profile?.username || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/challenges/requests">Join Requests</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
