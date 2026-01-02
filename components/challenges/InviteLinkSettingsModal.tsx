'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { updateInviteLinkSettings } from '@/app/actions/inviteLinks';
import { format } from 'date-fns';

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

interface InviteLinkSettingsModalProps {
  link: InviteLink;
  onClose: () => void;
  onUpdate: (link: InviteLink) => void;
}

export default function InviteLinkSettingsModal({
  link,
  onClose,
  onUpdate,
}: InviteLinkSettingsModalProps) {
  const [autoAdmit, setAutoAdmit] = useState(link.auto_admit);
  const [expiresAt, setExpiresAt] = useState<string>(
    link.expires_at ? format(new Date(link.expires_at), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [maxUses, setMaxUses] = useState<string>(
    link.max_uses ? link.max_uses.toString() : ''
  );
  const [showAdvanced, setShowAdvanced] = useState(
    !!(link.expires_at || link.max_uses)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const result = await updateInviteLinkSettings(link.id, {
      auto_admit: autoAdmit,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      max_uses: maxUses ? parseInt(maxUses, 10) : null,
    });

    if (result.success) {
      onUpdate({
        ...link,
        auto_admit: autoAdmit,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
      });
    } else {
      setError(result.error || 'Failed to update settings');
    }

    setIsSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Link Settings</DialogTitle>
          <DialogDescription>
            Configure how this invite link works
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Auto-admit Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-admit" className="text-base">
                Auto-admit
              </Label>
              <p className="text-sm text-muted-foreground">
                {autoAdmit
                  ? 'Users join instantly when they click the link'
                  : 'Users must wait for your approval to join'}
              </p>
            </div>
            <Switch
              id="auto-admit"
              checked={autoAdmit}
              onCheckedChange={setAutoAdmit}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between px-0 hover:bg-transparent"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="text-sm font-medium">Advanced Settings</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 pl-1 border-l-2 border-muted ml-2">
              {/* Expiration Date */}
              <div className="space-y-2 pl-4">
                <Label htmlFor="expires-at">Expiration Date</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>

              {/* Max Uses */}
              <div className="space-y-2 pl-4">
                <Label htmlFor="max-uses">Maximum Uses</Label>
                <Input
                  id="max-uses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited uses
                  {link.use_count > 0 && ` (${link.use_count} uses so far)`}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
