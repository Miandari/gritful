'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check, RefreshCw, Settings, Link2, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { getInviteLink, createInviteLink, revokeInviteLink, regenerateInviteLink } from '@/app/actions/inviteLinks';
import InviteLinkSettingsModal from './InviteLinkSettingsModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InviteLinkCardProps {
  challengeId: string;
}

interface InviteLink {
  id: string;
  token: string;
  auto_admit: boolean;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export default function InviteLinkCard({ challengeId }: InviteLinkCardProps) {
  const [link, setLink] = useState<InviteLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.gritful.app';
  const inviteUrl = link ? `${baseUrl}/invite/${link.token}` : '';

  // Fetch existing link on mount
  useEffect(() => {
    const fetchLink = async () => {
      setIsLoading(true);
      const result = await getInviteLink(challengeId);
      if (result.success && result.link) {
        setLink(result.link);
      }
      setIsLoading(false);
    };
    fetchLink();
  }, [challengeId]);

  const handleCreateLink = async () => {
    setIsCreating(true);
    setError(null);
    const result = await createInviteLink(challengeId);
    if (result.success && result.link) {
      setLink(result.link);
    } else {
      setError(result.error || 'Failed to create invite link');
    }
    setIsCreating(false);
  };

  const handleRevokeLink = async () => {
    if (!link) return;
    setIsRevoking(true);
    setError(null);
    const result = await revokeInviteLink(link.id);
    if (result.success) {
      setLink(null);
    } else {
      setError(result.error || 'Failed to revoke invite link');
    }
    setIsRevoking(false);
    setShowRevokeDialog(false);
  };

  const handleRegenerateLink = async () => {
    setIsRegenerating(true);
    setError(null);
    const result = await regenerateInviteLink(challengeId, link ? {
      auto_admit: link.auto_admit,
      expires_at: link.expires_at,
      max_uses: link.max_uses,
    } : undefined);
    if (result.success && result.link) {
      setLink(result.link);
    } else {
      setError(result.error || 'Failed to regenerate invite link');
    }
    setIsRegenerating(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSettingsUpdate = (updatedLink: InviteLink) => {
    setLink(updatedLink);
    setShowSettings(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Invite Link
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!link) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Invite Link
          </CardTitle>
          <CardDescription>
            Create a shareable link to invite people to this challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          <Button onClick={handleCreateLink} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Create Invite Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if link is expired or maxed out
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
  const isMaxedOut = link.max_uses && link.use_count >= link.max_uses;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Invite Link
              </CardTitle>
              <CardDescription>
                Share this link to invite people
              </CardDescription>
            </div>
            {(isExpired || isMaxedOut) && (
              <Badge variant="destructive">
                {isExpired ? 'Expired' : 'Max uses reached'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Link URL */}
          <div className="flex gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              title="Open link"
            >
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Link Settings Display */}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant={link.auto_admit ? 'default' : 'secondary'}>
              {link.auto_admit ? 'Auto-admit' : 'Requires approval'}
            </Badge>
            {link.expires_at && (
              <Badge variant="outline">
                Expires: {format(new Date(link.expires_at), 'MMM d, yyyy')}
              </Badge>
            )}
            {link.max_uses && (
              <Badge variant="outline">
                Uses: {link.use_count}/{link.max_uses}
              </Badge>
            )}
            {!link.expires_at && !link.max_uses && (
              <Badge variant="outline">No limits</Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateLink}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {showSettings && (
        <InviteLinkSettingsModal
          link={link}
          onClose={() => setShowSettings(false)}
          onUpdate={handleSettingsUpdate}
        />
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently disable this invite link. Anyone who has this link
              will no longer be able to use it to join the challenge. You can create
              a new link afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeLink}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Link'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
