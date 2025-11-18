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
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch profile data including avatar
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      setProfile(data);
    };

    // Fetch unread challenge updates count
    const fetchUnreadCount = async () => {
      const { data, error } = await supabase.rpc('get_total_unread_updates', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(data || 0);
    };

    fetchProfile();
    fetchUnreadCount();

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

    // Subscribe to new challenge messages
    const messagesChannel = supabase
      .channel('challenge-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'challenge_messages',
        },
        () => {
          // Refresh unread count when any new message is posted
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Subscribe to challenge_participants updates (when messages are marked as read)
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
          // Refresh unread count when last_message_read_at is updated
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [user, supabase]);

  const handleLogout = async () => {
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

                {/* Updates Bell */}
                <Link href="/updates" className="relative">
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
