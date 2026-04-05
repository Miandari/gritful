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
    push_reminders: boolean;
    push_milestones: boolean;
    push_challenge_activity: boolean;
    push_leaderboard: boolean;
    reminder_time: string;
    reminder_timezone: string;
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
    push_reminders: preferences?.push_reminders ?? true,
    push_milestones: preferences?.push_milestones ?? true,
    push_challenge_activity: preferences?.push_challenge_activity ?? true,
    push_leaderboard: preferences?.push_leaderboard ?? true,
    reminder_time: preferences?.reminder_time ?? '20:00',
    reminder_timezone: preferences?.reminder_timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      {/* Push Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Control what push notifications you receive</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <PushNotificationManager />

          <div className="border-t pt-4 space-y-4" style={{ opacity: settings.app_notifications_enabled ? 1 : 0.5 }}>
            <p className="text-sm text-muted-foreground">Choose what to receive:</p>

            {/* Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_reminders">Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily reminder to log your entries
                  </p>
                </div>
                <Switch
                  id="push_reminders"
                  checked={settings.push_reminders}
                  onCheckedChange={(checked) => handleToggle('push_reminders', checked)}
                  disabled={isSaving === 'push_reminders'}
                />
              </div>
              {settings.push_reminders && (
                <div className="ml-0 pl-0 flex items-center gap-3 text-sm">
                  <Label htmlFor="reminder_time" className="text-muted-foreground whitespace-nowrap">
                    Remind me at
                  </Label>
                  <input
                    id="reminder_time"
                    type="time"
                    value={settings.reminder_time}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSettings({ ...settings, reminder_time: value });
                      const result = await updatePreferences({ reminder_time: value });
                      if (!result.success) {
                        toast.error('Failed to update reminder time');
                      }
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    ({settings.reminder_timezone.replace(/_/g, ' ')})
                  </span>
                </div>
              )}
            </div>

            {/* Milestones */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push_milestones">Milestones</Label>
                <p className="text-sm text-muted-foreground">
                  Streak achievements, points milestones
                </p>
              </div>
              <Switch
                id="push_milestones"
                checked={settings.push_milestones}
                onCheckedChange={(checked) => handleToggle('push_milestones', checked)}
                disabled={isSaving === 'push_milestones'}
              />
            </div>

            {/* Challenge Activity */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push_challenge_activity">Challenge Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Join requests, new members, creator updates
                </p>
              </div>
              <Switch
                id="push_challenge_activity"
                checked={settings.push_challenge_activity}
                onCheckedChange={(checked) => handleToggle('push_challenge_activity', checked)}
                disabled={isSaving === 'push_challenge_activity'}
              />
            </div>

            {/* Leaderboard */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push_leaderboard">Leaderboard</Label>
                <p className="text-sm text-muted-foreground">
                  Ranking changes, overtakes
                </p>
              </div>
              <Switch
                id="push_leaderboard"
                checked={settings.push_leaderboard}
                onCheckedChange={(checked) => handleToggle('push_leaderboard', checked)}
                disabled={isSaving === 'push_leaderboard'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
            <p className="text-blue-900 dark:text-blue-100">
              <strong>Email preferences:</strong> Most email types are OFF by default. You can opt-in to receive daily reminders, join requests, or weekly summaries. Challenge updates are enabled by default to keep you informed.
            </p>
          </div>
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
          <div className="space-y-4 transition-opacity" style={{ opacity: settings.email_notifications_enabled ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_daily_reminder">Daily Reminder</Label>
                <p className="text-sm text-muted-foreground">Get reminded to complete your daily challenges</p>
              </div>
              <Switch id="email_daily_reminder" checked={settings.email_daily_reminder} onCheckedChange={(checked) => handleToggle('email_daily_reminder', checked)} disabled={!settings.email_notifications_enabled || isSaving === 'email_daily_reminder'} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_challenge_updates">Challenge Updates</Label>
                <p className="text-sm text-muted-foreground">Updates about challenges you're participating in</p>
              </div>
              <Switch id="email_challenge_updates" checked={settings.email_challenge_updates} onCheckedChange={(checked) => handleToggle('email_challenge_updates', checked)} disabled={!settings.email_notifications_enabled || isSaving === 'email_challenge_updates'} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_join_requests">Join Requests</Label>
                <p className="text-sm text-muted-foreground">Notifications when someone requests to join your challenge</p>
              </div>
              <Switch id="email_join_requests" checked={settings.email_join_requests} onCheckedChange={(checked) => handleToggle('email_join_requests', checked)} disabled={!settings.email_notifications_enabled || isSaving === 'email_join_requests'} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_weekly_summary">Weekly Summary</Label>
                <p className="text-sm text-muted-foreground">A weekly summary of your progress and achievements</p>
              </div>
              <Switch id="email_weekly_summary" checked={settings.email_weekly_summary} onCheckedChange={(checked) => handleToggle('email_weekly_summary', checked)} disabled={!settings.email_notifications_enabled || isSaving === 'email_weekly_summary'} />
            </div>
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
