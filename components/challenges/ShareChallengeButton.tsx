'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { getShareUrl } from '@/app/actions/challengeShare';
import { buildPublicShareUrl, buildShareText } from '@/lib/utils/shareUrls';
import toast from 'react-hot-toast';

interface ShareChallengeButtonProps {
  challengeId: string;
  challengeName: string;
  challengeDurationDays: number | null;
  isPublic: boolean;
  isCreator: boolean;
}

export default function ShareChallengeButton({
  challengeId,
  challengeName,
  challengeDurationDays,
  isPublic,
  isCreator,
}: ShareChallengeButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.gritful.app';
  const shareText = buildShareText(challengeName, challengeDurationDays);

  const fetchShareUrl = useCallback(async () => {
    // Public challenges: URL known instantly, no server call
    if (isPublic) {
      setShareUrl(buildPublicShareUrl(challengeId, baseUrl));
      return;
    }

    // Private challenges: need server action to resolve invite link
    setLoading(true);
    setError(null);
    const result = await getShareUrl(challengeId);
    setLoading(false);

    if (result.success && result.url) {
      setShareUrl(result.url);
    } else if (result.error === 'no_invite_link') {
      setError('No invite link available. Ask the challenge creator to create one.');
    } else {
      setError(result.error || 'Could not generate share link.');
    }
  }, [challengeId, isPublic, baseUrl]);

  // Fetch URL when dialog opens
  useEffect(() => {
    if (open) {
      fetchShareUrl();
    } else {
      // Reset state when dialog closes
      if (!isPublic) {
        setShareUrl(null);
        setLoading(false);
        setError(null);
      }
      setCopied(false);
    }
  }, [open, fetchShareUrl, isPublic]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      // Only pass title + url. Passing text causes macOS/iOS to concatenate
      // url + text when user picks "Copy" from the native share sheet.
      await navigator.share({
        title: challengeName,
        url: shareUrl,
      });
    } catch (err) {
      // AbortError = user cancelled, ignore silently
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fall through -- user can still use Copy button
      }
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4 sm:mr-2" />
        <span className="sm:inline hidden">Share</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Challenge
            </DialogTitle>
            <DialogDescription>
              {shareText}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  {error !== 'No invite link available. Ask the challenge creator to create one.' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchShareUrl}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              </div>
            )}

            {shareUrl && (
              <>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
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
                </div>

                <div className="flex flex-col gap-2">
                  {canNativeShare && (
                    <Button onClick={handleNativeShare} className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Share via...
                    </Button>
                  )}
                  <Button
                    variant={canNativeShare ? 'outline' : 'default'}
                    onClick={handleCopy}
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact share icon button for use on challenge cards.
 * Public challenges only -- URL is known client-side, no async needed.
 */
export function ShareIconButton({
  challengeId,
  challengeName,
  durationDays,
}: {
  challengeId: string;
  challengeName: string;
  durationDays: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.gritful.app';
    const url = buildPublicShareUrl(challengeId, baseUrl);
    const text = buildShareText(challengeName, durationDays);

    if (navigator.share) {
      try {
        await navigator.share({ title: challengeName, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // Fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title="Share challenge"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </button>
  );
}
