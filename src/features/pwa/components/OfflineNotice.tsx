'use client';

import { WifiOff } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import { useOnline } from '../useOnline';

/**
 * Says the app is offline, for as long as it is.
 *
 * Without it the two states look the same. The shell opens from the cache
 * either way, so a list that is an hour old and a list that is current are
 * indistinguishable — and a save that fails reads as the app being broken
 * rather than the train being in a tunnel.
 *
 * Above the nav rather than at the top: the top belongs to the toasts, and a
 * failed write raises one in exactly the moment this is also showing.
 */
export function OfflineNotice() {
  const t = useT();
  const online = useOnline();

  if (online) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(var(--nav-clearance) + 0.5rem)' }}
    >
      <p className="bg-ink flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg">
        <WifiOff className="size-3.5" aria-hidden />
        {t('pwa.offline.badge')}
      </p>
    </div>
  );
}
