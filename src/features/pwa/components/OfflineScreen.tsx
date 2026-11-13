'use client';

import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';

/**
 * What the service worker answers with when it has nothing else.
 *
 * Every screen the app links to is in the precache, so this is reached only by
 * an address that is not one of them — a shared `/place/<slug>` link opened
 * with no connection. The worker serves this page *at that address*, which is
 * why retrying is a reload rather than a link: the URL in the bar is still the
 * one the reader wanted.
 */
export function OfflineScreen() {
  const t = useT();

  useEffect(() => {
    const retry = () => {
      window.location.reload();
    };
    // Nobody should have to notice the signal came back and press a button.
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('online', retry);
    };
  }, []);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center">
      <EmptyState
        icon={<WifiOff className="size-7" aria-hidden />}
        title={t('pwa.offline.title')}
        description={t('pwa.offline.body')}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    </main>
  );
}
