'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, UserPlus, Check, X, ChevronRight,
  MessageSquare, Users, Flame, Trophy, TrendingUp, Loader2,
} from 'lucide-react';
import { BackButton } from '@/components/shared/BackButton';
import JoinRequestActions from '@/components/challenges/JoinRequestActions';
import MarkAllNotificationsReadButton from '@/components/notifications/MarkAllNotificationsReadButton';
import {
  getNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from '@/app/actions/notifications';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'social', label: 'Social' },
  { key: 'leaderboard', label: 'Leaderboard' },
] as const;

type CategoryFilter = typeof CATEGORIES[number]['key'];

function getNotificationIcon(type: string) {
  switch (type) {
    case 'join_request':
      return <UserPlus className="h-5 w-5 text-blue-500" />;
    case 'join_approved':
      return <Check className="h-5 w-5 text-primary" />;
    case 'join_rejected':
      return <X className="h-5 w-5 text-red-500" />;
    case 'challenge_update':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'participant_joined':
      return <Users className="h-5 w-5 text-primary" />;
    case 'streak_milestone':
      return <Flame className="h-5 w-5 text-orange-500" />;
    case 'points_milestone':
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 'leaderboard_overtake':
      return <TrendingUp className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

function getActionLink(notification: Notification): { href: string; label: string } | null {
  const challengeId = notification.data.challenge_id;
  const url = notification.data.url;

  if (url) return { href: url, label: 'View' };

  switch (notification.type) {
    case 'join_approved':
    case 'join_rejected':
    case 'challenge_update':
    case 'participant_joined':
      return challengeId
        ? { href: `/challenges/${challengeId}`, label: 'View Challenge' }
        : null;
    case 'streak_milestone':
    case 'points_milestone':
      return challengeId
        ? { href: `/challenges/${challengeId}/progress`, label: 'View Progress' }
        : null;
    case 'leaderboard_overtake':
      return challengeId
        ? { href: `/challenges/${challengeId}/progress`, label: 'View Leaderboard' }
        : null;
    default:
      return null;
  }
}

interface NotificationFeedProps {
  initialNotifications: Notification[];
}

export function NotificationFeed({ initialNotifications }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialNotifications.length === 50);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  // Mark all as read on page visit (standard pattern -- GitHub, LinkedIn, etc.)
  useEffect(() => {
    if (initialNotifications.some((n) => !n.read)) {
      markAllNotificationsAsRead().then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      });
    }
  }, []);

  // Subscribe to real-time notification updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only prepend if it matches the current filter
          if (filter === 'all' || newNotification.category === filter) {
            setNotifications((prev) => [newNotification, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, filter]);

  // Refetch when filter changes
  useEffect(() => {
    if (filter === 'all' && notifications === initialNotifications) return;

    setLoading(true);
    const category = filter === 'all' ? undefined : filter;
    getNotifications(50, undefined, category).then(({ notifications: data }) => {
      setNotifications(data);
      setHasMore(data.length === 50);
      setLoading(false);
    });
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (notifications.length === 0) return;
    setLoading(true);
    const cursor = notifications[notifications.length - 1].created_at;
    const category = filter === 'all' ? undefined : filter;
    const { notifications: more } = await getNotifications(50, cursor, category);
    setNotifications((prev) => [...prev, ...more]);
    setHasMore(more.length === 50);
    setLoading(false);
  }, [notifications, filter]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.read) return;
    startTransition(async () => {
      await markNotificationsAsRead([notification.id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    });
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay updated with your challenges and activity
            </p>
          </div>
        </div>
        {hasUnread && <MarkAllNotificationsReadButton />}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
            className="rounded-full"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Notification list */}
      {loading && notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              You&apos;ll see activity from your challenges here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const actionLink = getActionLink(notification);

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                  !notification.read
                    ? 'bg-card border-border'
                    : 'bg-transparent border-transparent hover:bg-card/50'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-2 w-2">
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      !notification.read
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  )}

                  {/* Join request actions */}
                  {notification.type === 'join_request' &&
                    notification.data.request_id && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <JoinRequestActions
                          requestId={notification.data.request_id}
                        />
                      </div>
                    )}

                  {/* Action link */}
                  {actionLink && notification.type !== 'join_request' && (
                    <div className="mt-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        <Link href={actionLink.href}>
                          {actionLink.label}
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="flex-shrink-0 text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: false,
                  })}
                </span>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
