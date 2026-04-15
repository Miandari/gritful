'use client';

import { useEffect, useState, useRef } from 'react';
import { Share, Download, X } from 'lucide-react';

const PERMANENT_DISMISS_KEY = 'pwa-install-dismissed';
const SESSION_DISMISS_KEY = 'pwa-install-dismissed-session';
const CHROMIUM_ELIGIBLE_KEY = 'pwa-install-chromium-eligible';
const WAS_STANDALONE_KEY = 'pwa-was-standalone';
const DISMISS_COOLDOWN_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator &&
      (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<'ios' | 'chromium' | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Record standalone state so we can detect uninstalls later.
    // When the user has the PWA installed, isStandalone() is true and
    // we set a flag. If they later visit in Safari (isStandalone() false)
    // while the flag is set, they likely removed the PWA — clear the
    // dismiss so they see the install prompt again.
    if (isStandalone()) {
      localStorage.setItem(WAS_STANDALONE_KEY, '1');
      return;
    }

    if (localStorage.getItem(WAS_STANDALONE_KEY)) {
      localStorage.removeItem(WAS_STANDALONE_KEY);
      localStorage.removeItem(PERMANENT_DISMISS_KEY);
    }

    // Time-based reset: if "Don't show again" was clicked more than 30
    // days ago, re-show the prompt. The user may have changed their mind.
    const dismissedAt = localStorage.getItem(PERMANENT_DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_COOLDOWN_DAYS) return;
      localStorage.removeItem(PERMANENT_DISMISS_KEY);
    }

    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;

    // iOS Safari: show manual instructions
    if (isIOSSafari()) {
      setPlatform('ios');
      return;
    }

    // Chromium (Android, desktop Chrome/Edge): capture install prompt
    // Show banner immediately if we've seen the event before in this session
    // (the event may not have re-fired yet after a login redirect)
    if (sessionStorage.getItem(CHROMIUM_ELIGIBLE_KEY)) {
      setPlatform('chromium');
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      sessionStorage.setItem(CHROMIUM_ELIGIBLE_KEY, '1');
      setPlatform('chromium');
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!platform) return null;

  const dismiss = () => {
    setPlatform(null);
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
  };

  const dismissPermanently = () => {
    setPlatform(null);
    localStorage.setItem(PERMANENT_DISMISS_KEY, Date.now().toString());
    sessionStorage.removeItem(CHROMIUM_ELIGIBLE_KEY);
  };

  const installChromium = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) {
      // Event hasn't re-fired yet after navigation -- fall back to
      // browser's address bar install button hint
      dismiss();
      return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setPlatform(null);
      localStorage.setItem(PERMANENT_DISMISS_KEY, Date.now().toString());
    }
    deferredPromptRef.current = null;
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Install Gritful
            </p>

            {platform === 'ios' && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Tap the{' '}
                <Share className="inline-block h-3.5 w-3.5 -translate-y-px" />{' '}
                Share button, then tap{' '}
                <span className="font-medium text-foreground">
                  Add to Home Screen
                </span>
                .
              </p>
            )}

            {platform === 'chromium' && (
              <>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Get quick access from your home screen.
                </p>
                <button
                  onClick={installChromium}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install
                </button>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            className="mt-0.5 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={dismissPermanently}
          className="mt-2 block w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Don't show again
        </button>
      </div>
    </div>
  );
}
