'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { updatePreferences } from '@/app/actions/profile';
import toast from 'react-hot-toast';
import { Mail, Bell, Shield, Palette } from 'lucide-react';
import { PushNotificationManager } from '@/components/shared/PushNotificationManager';

interface ProfileSettingsSectionProps {
  preferences: {
    email_notifications_enabled: boolean;
    email_daily_reminder: boolean;
    email_challenge_updates: boolean;
    email_join_requests: boolean;
    email_weekly_summary: boolean;
    app_notifications_enabled: boolean;
    profile_visibility: string;
    show_email: boolean;
    theme: string;
  } | null;
}

export default function ProfileSettingsSection({ preferences }: ProfileSettingsSectionProps) {
  const [settings, setSettings] = useState({
    email_notifications_enabled: preferences?.email_notifications_enabled ?? true,
    email_daily_reminder: preferences?.email_daily_reminder ?? true,
    email_challenge_updates: preferences?.email_challenge_updates ?? true,
    email_join_requests: preferences?.email_join_requests ?? true,
    email_weekly_summary: preferences?.email_weekly_summary ?? true,
    app_notifications_enabled: preferences?.app_notifications_enabled ?? true,
    profile_visibility: preferences?.profile_visibility ?? 'public',
    show_email: preferences?.show_email ?? false,
    theme: preferences?.theme ?? 'system',
  });

  const [isSaving, setIsSaving] = useState<string | null>(null);

  const handleToggle = async (key: string, value: boolean) => {
    setIsSaving(key);
    setSettings({ ...settings, [key]: value });

    const result = await updatePreferences({ [key]: value });

    if (result.success) {
      toast.success('Settings updated');
    } else {
      toast.error(result.error || 'Failed to update settings');
      // Revert on error
      setSettings({ ...settings, [key]: !value });
    }

    setIsSaving(null);
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage what emails you receive from us</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info about email preferences */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
            <p className="text-blue-900 dark:text-blue-100">
              <strong>Email preferences:</strong> Most email types are OFF by default. You can opt-in to receive daily reminders, join requests, or weekly summaries. Challenge updates are enabled by default to keep you informed.
            </p>
          </div>
          {/* Master Toggle */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="space-y-0.5">
              <Label htmlFor="email_notifications_enabled" className="text-base font-medium">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications from Gritful
              </p>
            </div>
            <Switch
              id="email_notifications_enabled"
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => handleToggle('email_notifications_enabled', checked)}
              disabled={isSaving === 'email_notifications_enabled'}
            />
          </div>

          {/* Individual Email Preferences */}
          <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: settings.email_notifications_enabled ? 1 : 0.5 }}>
            {/* Daily Reminder */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_daily_reminder">Daily Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded to complete your daily challenges
                </p>
              </div>
              <Switch
                id="email_daily_reminder"
                checked={settings.email_daily_reminder}
                onCheckedChange={(checked) => handleToggle('email_daily_reminder', checked)}
                disabled={!settings.email_notifications_enabled || isSaving === 'email_daily_reminder'}
              />
            </div>

            {/* Challenge Updates */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_challenge_updates">Challenge Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Updates about challenges you're participating in
                </p>
              </div>
              <Switch
                id="email_challenge_updates"
                checked={settings.email_challenge_updates}
                onCheckedChange={(checked) => handleToggle('email_challenge_updates', checked)}
                disabled={!settings.email_notifications_enabled || isSaving === 'email_challenge_updates'}
              />
            </div>

            {/* Join Requests */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_join_requests">Join Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when someone requests to join your challenge
                </p>
              </div>
              <Switch
                id="email_join_requests"
                checked={settings.email_join_requests}
                onCheckedChange={(checked) => handleToggle('email_join_requests', checked)}
                disabled={!settings.email_notifications_enabled || isSaving === 'email_join_requests'}
              />
            </div>

            {/* Weekly Summary */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_weekly_summary">Weekly Summary</Label>
                <p className="text-sm text-muted-foreground">
                  A weekly summary of your progress and achievements
                </p>
              </div>
              <Switch
                id="email_weekly_summary"
                checked={settings.email_weekly_summary}
                onCheckedChange={(checked) => handleToggle('email_weekly_summary', checked)}
                disabled={!settings.email_notifications_enabled || isSaving === 'email_weekly_summary'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Manage in-app notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="app_notifications_enabled" className="text-base font-medium">
                Enable In-App Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the app
              </p>
            </div>
            <Switch
              id="app_notifications_enabled"
              checked={settings.app_notifications_enabled}
              onCheckedChange={(checked) => handleToggle('app_notifications_enabled', checked)}
              disabled={isSaving === 'app_notifications_enabled'}
            />
          </div>

          <div className="border-t pt-4">
            <PushNotificationManager />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy and visibility</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show Email */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_email">Show Email on Profile</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to see your email address
              </p>
            </div>
            <Switch
              id="show_email"
              checked={settings.show_email}
              onCheckedChange={(checked) => handleToggle('show_email', checked)}
              disabled={isSaving === 'show_email'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences Card - Placeholder for future */}
      <Card className="opacity-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Theme and display settings (Coming Soon)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Theme customization and display preferences will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Expandable Section Placeholder */}
      {/*
        This section structure makes it easy to add new preference categories.
        Simply copy a Card block and add new preference toggles.

        Example future sections:
        - Security Settings (2FA, password change)
        - Connected Accounts (OAuth integrations)
        - Data & Privacy (export data, delete account)
        - Advanced Settings (API keys, webhooks)
      */}
    </div>
  );
}
