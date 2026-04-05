'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface NotificationData {
  challenge_id?: string;
  request_id?: string;
  requester_id?: string;
  requester_username?: string;
  status?: string;
  url?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: NotificationData;
  category: 'personal' | 'social' | 'leaderboard' | 'system';
  read: boolean;
  created_at: string;
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  limit: number = 50,
  cursor?: string,
  category?: string
): Promise<{ notifications: Notification[], error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], error: 'Not authenticated' };
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [], error: error.message };
  }

  return { notifications: (data as Notification[]) || [] };
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Update all unread notifications for this user
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error marking notifications as read:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Mark specific notifications as read by their IDs
 */
export async function markNotificationsAsRead(notificationIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Update specified notifications for this user
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error marking notifications as read:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
