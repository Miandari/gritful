import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getNotifications } from '@/app/actions/notifications';
import { NotificationFeed } from '@/components/notifications/NotificationFeed';

export const revalidate = 0;

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { notifications } = await getNotifications(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <NotificationFeed initialNotifications={notifications} />
    </div>
  );
}
