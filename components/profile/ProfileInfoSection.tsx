'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { updateProfile } from '@/app/actions/profile';
import toast from 'react-hot-toast';
import { Loader2, User, Globe, Twitter, Github, Instagram, MapPin, Link as LinkIcon } from 'lucide-react';

interface ProfileInfoSectionProps {
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
}

export default function ProfileInfoSection({ profile, userEmail }: ProfileInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
    website_url: profile?.website_url || '',
    twitter_handle: profile?.twitter_handle || '',
    github_handle: profile?.github_handle || '',
    instagram_handle: profile?.instagram_handle || '',
    location: profile?.location || '',
    public_profile_url: profile?.public_profile_url || '',
  });

  const handleSave = async () => {
    setIsSaving(true);

    const result = await updateProfile(formData);

    if (result.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } else {
      toast.error(result.error || 'Failed to update profile');
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      username: profile?.username || '',
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || '',
      website_url: profile?.website_url || '',
      twitter_handle: profile?.twitter_handle || '',
      github_handle: profile?.github_handle || '',
      instagram_handle: profile?.instagram_handle || '',
      location: profile?.location || '',
      public_profile_url: profile?.public_profile_url || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload and manage your profile picture</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <AvatarUpload
            currentAvatarUrl={profile?.avatar_url || null}
            username={profile?.username || null}
          />
        </CardContent>
      </Card>

      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal information and bio</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">
              Username {isEditing && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, underscores, and hyphens only
              </p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
              rows={4}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Brief description for your profile
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Links & Location Card */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links & Location</CardTitle>
          <CardDescription>Share your social profiles and location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="San Francisco, CA"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website_url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="website_url"
              type="url"
              placeholder="https://example.com"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              disabled={!isEditing}
              className={!isEditing ? 'bg-muted' : ''}
            />
          </div>

          {/* Twitter Handle */}
          <div className="space-y-2">
            <Label htmlFor="twitter_handle" className="flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              Twitter
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="twitter_handle"
                type="text"
                placeholder="username"
                value={formData.twitter_handle}
                onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                disabled={!isEditing}
                className={`rounded-l-none ${!isEditing ? 'bg-muted' : ''}`}
              />
            </div>
          </div>

          {/* GitHub Handle */}
          <div className="space-y-2">
            <Label htmlFor="github_handle" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                github.com/
              </span>
              <Input
                id="github_handle"
                type="text"
                placeholder="username"
                value={formData.github_handle}
                onChange={(e) => setFormData({ ...formData, github_handle: e.target.value })}
                disabled={!isEditing}
                className={`rounded-l-none ${!isEditing ? 'bg-muted' : ''}`}
              />
            </div>
          </div>

          {/* Instagram Handle */}
          <div className="space-y-2">
            <Label htmlFor="instagram_handle" className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="instagram_handle"
                type="text"
                placeholder="username"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                disabled={!isEditing}
                className={`rounded-l-none ${!isEditing ? 'bg-muted' : ''}`}
              />
            </div>
          </div>

          {/* Public Profile URL */}
          <div className="space-y-2">
            <Label htmlFor="public_profile_url" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Custom Profile URL
            </Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                gritful.app/u/
              </span>
              <Input
                id="public_profile_url"
                type="text"
                placeholder="your-username"
                value={formData.public_profile_url}
                onChange={(e) => setFormData({ ...formData, public_profile_url: e.target.value.toLowerCase() })}
                disabled={!isEditing}
                className={`rounded-l-none ${!isEditing ? 'bg-muted' : ''}`}
              />
            </div>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
