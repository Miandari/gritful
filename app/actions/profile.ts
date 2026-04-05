'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Update user profile information
 */
export async function updateProfile(data: {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  website_url?: string;
  twitter_handle?: string;
  github_handle?: string;
  instagram_handle?: string;
  location?: string;
  public_profile_url?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate username if provided
    if (data.username) {
      // Check if username is already taken (excluding current user)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', data.username)
        .neq('id', user.id)
        .single();

      if (existingProfile) {
        return { success: false, error: 'Username is already taken' };
      }

      // Validate username format (alphanumeric, underscores, hyphens)
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(data.username)) {
        return {
          success: false,
          error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens',
        };
      }
    }

    // Validate public_profile_url if provided
    if (data.public_profile_url) {
      // Ensure it's lowercase
      data.public_profile_url = data.public_profile_url.toLowerCase();

      // Check if public_profile_url is already taken (excluding current user)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_profile_url', data.public_profile_url)
        .neq('id', user.id)
        .single();

      if (existingProfile) {
        return { success: false, error: 'This profile URL is already taken' };
      }

      // Validate format (lowercase, alphanumeric, hyphens only)
      const urlRegex = /^[a-z0-9-]+$/;
      if (!urlRegex.test(data.public_profile_url)) {
        return {
          success: false,
          error: 'Profile URL must contain only lowercase letters, numbers, and hyphens',
        };
      }
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(data: {
  // Email preferences (existing)
  email_notifications_enabled?: boolean;
  email_daily_reminder?: boolean;
  email_challenge_updates?: boolean;
  email_join_requests?: boolean;
  email_weekly_summary?: boolean;

  // App preferences
  app_notifications_enabled?: boolean;

  // Per-category push toggles
  push_reminders?: boolean;
  push_milestones?: boolean;
  push_challenge_activity?: boolean;
  push_leaderboard?: boolean;

  // Per-category email toggles (schema-ready, not wired up)
  email_reminders?: boolean;
  email_milestones?: boolean;
  email_challenge_activity?: boolean;
  email_leaderboard?: boolean;

  // Reminder settings
  reminder_time?: string;
  reminder_timezone?: string;

  // Privacy settings
  profile_visibility?: 'public' | 'private' | 'friends';
  show_email?: boolean;

  // Display preferences
  theme?: 'light' | 'dark' | 'system';
  timezone?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Check if preferences exist
    const { data: existingPreferences } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingPreferences) {
      // Update existing preferences
      const { error } = await supabase
        .from('user_preferences')
        .update(data)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating preferences:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new preferences
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...data,
        });

      if (error) {
        console.error('Error creating preferences:', error);
        return { success: false, error: error.message };
      }
    }

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating preferences:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Sync browser timezone to user_preferences.
 * Only updates if the current value is still 'UTC' (never overwrite explicit choice).
 * Called by TimezoneSync component on first authenticated page load.
 */
export async function syncTimezone(timezone: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  try {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('reminder_timezone')
      .eq('user_id', user.id)
      .maybeSingle();

    // Only update if still defaulted to UTC
    if (prefs && prefs.reminder_timezone !== 'UTC') {
      return { success: true };
    }

    if (prefs) {
      await supabase
        .from('user_preferences')
        .update({ reminder_timezone: timezone })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_preferences')
        .insert({ user_id: user.id, reminder_timezone: timezone });
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
