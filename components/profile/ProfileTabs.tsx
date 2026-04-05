'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileInfoSection from '@/components/profile/ProfileInfoSection';
import ProfileSettingsSection from '@/components/profile/ProfileSettingsSection';

interface ProfileTabsProps {
  profile: {
    username: string | null;
    full_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    website_url: string | null;
    twitter_handle: string | null;
    github_handle: string | null;
    instagram_handle: string | null;
    location: string | null;
    public_profile_url: string | null;
  } | null;
  userEmail: string;
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

export default function ProfileTabs({ profile, userEmail, preferences }: ProfileTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') === 'settings' ? 'settings' : 'info';

  const handleTabChange = (value: string) => {
    if (value === 'settings') {
      router.push('/profile?tab=settings');
    } else {
      router.push('/profile');
    }
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="info">Basic Info</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      {/* Basic Info Tab */}
      <TabsContent value="info">
        <ProfileInfoSection profile={profile} userEmail={userEmail} />
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings">
        <ProfileSettingsSection preferences={preferences} />
      </TabsContent>
    </Tabs>
  );
}
