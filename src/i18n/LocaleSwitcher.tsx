'use client';

import { Check, Languages } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LOCALES, LOCALE_LABELS } from './config';
import { useLocale, useT } from './I18nProvider';
import { useSetLocale } from './useSetLocale';

/**
 * The language control.
 *
 * Each option is written in its own language — "Tiếng Việt", not "Vietnamese"
 * — because the person who most needs this control is the one who cannot read
 * the language currently on screen.
 */
export function LocaleSwitcher() {
  const t = useT();
  const locale = useLocale();
  const { setLocale, isPending } = useSetLocale();

  return (
    <section>
      <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
        <Languages className="size-4" aria-hidden />
        {t('language.title')}
      </h2>
      <p className="text-ink-subtle mt-0.5 text-xs">{t('language.description')}</p>

      <div className="bg-surface mt-2 overflow-hidden rounded-lg shadow-sm">
        {LOCALES.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={isPending}
            aria-current={option === locale ? 'true' : undefined}
            onClick={() => {
              setLocale(option);
            }}
            className={cn(
              'flex w-full items-center justify-between px-4 py-3.5 text-left',
              index > 0 && 'border-border border-t',
              option === locale ? 'text-primary font-medium' : 'text-ink',
            )}
          >
            <span className="text-md">{LOCALE_LABELS[option]}</span>
            {option === locale && <Check className="size-4 shrink-0" aria-hidden />}
          </button>
        ))}
      </div>
    </section>
  );
}
