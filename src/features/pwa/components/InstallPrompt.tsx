'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Capacitor } from '@capacitor/core';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOnboardingPending } from '@/features/onboarding/store';
import { useT } from '@/i18n/I18nProvider';
import { isIos, resolveInstallMode, useInstallStore } from '../install';
import { useHydrated, useOnline } from '../useOnline';

/** Chromium's install event. Not in the DOM typings — it is not a standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Offers the app for the home screen, once.
 *
 * Two different things share this card. Chromium gives us an event we can
 * trigger, so there is a button. Safari gives us nothing — installation is
 * only reachable through its Share menu — so on iOS the card is a sentence
 * saying where to tap, and the only button is the one that closes it.
 */
export function InstallPrompt() {
  const t = useT();
  const hydrated = useHydrated();
  const online = useOnline();
  const onboarding = useOnboardingPending();
  const dismissed = useInstallStore((state) => state.dismissed);
  const dismiss = useInstallStore((state) => state.dismiss);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Stops Chrome's own mini-infobar, which would otherwise appear on top
      // of onboarding with no say from us about when.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Everything below reads the browser, and the prerendered HTML has none.
  if (!hydrated) return null;

  const mode = resolveInstallMode({
    native: Capacitor.isNativePlatform(),
    standalone: isStandalone(),
    ios: isIos(navigator.userAgent, navigator.maxTouchPoints),
    canPrompt: promptEvent !== null,
    online,
    // Unread storage counts as dismissed, so the card cannot flash at
    // somebody who already said no.
    dismissed: dismissed !== false,
    onboarding,
  });

  if (mode === 'none') return null;

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    // The event is single-use, and either answer is an answer: accepted means
    // it is installed, declined means do not ask again.
    setPromptEvent(null);
    dismiss();
  };

  return (
    <section
      aria-label={t('pwa.install.title')}
      className="absolute inset-x-0 z-40 px-4"
      style={{ bottom: 'calc(var(--nav-clearance) + 0.5rem)' }}
    >
      <div className="border-border bg-surface mx-auto flex max-w-md items-start gap-3 rounded-lg border p-3 shadow-lg">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-md"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-ink text-sm font-semibold">{t('pwa.install.title')}</h2>
          <p className="text-ink-muted mt-0.5 text-sm leading-snug">
            {mode === 'ios' ? (
              <>
                <Share className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                {t('pwa.install.iosBody')}
              </>
            ) : (
              t('pwa.install.body')
            )}
          </p>

          {mode === 'prompt' && (
            <Button
              size="sm"
              className="mt-2.5"
              onClick={() => {
                void install();
              }}
            >
              {t('pwa.install.action')}
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t('pwa.install.dismiss')}
          className="text-ink-muted hover:bg-surface-sunken -m-1 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
