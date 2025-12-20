import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, UserPlus, Check, X, ChevronRight } from 'lucide-react';
import JoinRequestActions from '@/components/challenges/JoinRequestActions';
import MarkAllNotificationsReadButton from '@/components/notifications/MarkAllNotificationsReadButton';

export const revalidate = 0;

interface NotificationData {
  challenge_id?: string;
  request_id?: string;
  requester_id?: string;
  requester_username?: string;
  status?: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: NotificationData;
  read: boolean;
  created_at: string;
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const typedNotifications = (notifications as Notification[]) || [];

  // Group notifications
  const joinRequests = typedNotifications.filter(n => n.type === 'join_request');
  const approvals = typedNotifications.filter(n => n.type === 'join_approved');
  const rejections = typedNotifications.filter(n => n.type === 'join_rejected');
  const otherNotifications = typedNotifications.filter(
    n => !['join_request', 'join_approved', 'join_rejected'].includes(n.type)
  );

  const hasUnread = typedNotifications.some(n => !n.read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'join_approved':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'join_rejected':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderNotification = (notification: Notification) => (
    <div
      key={notification.id}
      className={`flex items-start gap-4 p-4 border rounded-lg ${
        !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{notification.title}</p>
            {notification.message && (
              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          {!notification.read && (
            <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              New
            </Badge>
          )}
        </div>

        {/* Action buttons for join requests */}
        {notification.type === 'join_request' && notification.data.request_id && (
          <div className="mt-3">
            <JoinRequestActions requestId={notification.data.request_id} />
          </div>
        )}

        {/* Link to challenge for approvals/rejections */}
        {(notification.type === 'join_approved' || notification.type === 'join_rejected') &&
          notification.data.challenge_id && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href={`/challenges/${notification.data.challenge_id}`}>
                  View Challenge
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="mt-2 text-muted-foreground">
            Stay updated with join requests and challenge activity
          </p>
        </div>
        {hasUnread && <MarkAllNotificationsReadButton />}
      </div>

      {typedNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              You&apos;ll be notified when someone requests to join your challenges
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Join Requests - Most important */}
          {joinRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Join Requests
                </CardTitle>
                <CardDescription>
                  People requesting to join your private challenges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {joinRequests.map(renderNotification)}
              </CardContent>
            </Card>
          )}

          {/* Approvals */}
          {approvals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Approved Requests
                </CardTitle>
                <CardDescription>Your requests that were approved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvals.map(renderNotification)}
              </CardContent>
            </Card>
          )}

          {/* Rejections */}
          {rejections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-500" />
                  Declined Requests
                </CardTitle>
                <CardDescription>Your requests that were not approved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rejections.map(renderNotification)}
              </CardContent>
            </Card>
          )}

          {/* Other notifications */}
          {otherNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Other Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherNotifications.map(renderNotification)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
