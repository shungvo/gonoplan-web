'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { SoonTabIcon } from '@/components/icons/tabs';
import { useT } from '@/i18n/I18nProvider';

/**
 * The fourth tab, deliberately empty.
 *
 * The profile used to live here and has moved to the avatar in the home
 * header. Rather than shuffle the nearest available screen into the gap — a
 * tab that exists because there was a slot, which is how navigation ends up
 * meaning nothing — the slot says plainly that it is being kept for something.
 *
 * It stays a real route with a real title, so the tab has an accessible name
 * and does not read to a screen reader as a link to nowhere.
 */
export function SoonScreen() {
  const t = useT();

  return (
    <div className="px-safe">
      <header className="pt-safe-float px-5">
        <h1 className="text-ink text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t('nav.soon')}
        </h1>
      </header>

      <div className="px-5">
        <EmptyState
          className="pt-16"
          icon={<SoonTabIcon filled={false} className="size-7" />}
          title={t('soon.title')}
          description={t('soon.body')}
        />
      </div>
    </div>
  );
}
