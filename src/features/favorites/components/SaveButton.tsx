'use client';

import { Bookmark } from 'lucide-react';
import { useToggleSave } from '../hooks/useFavorites';
import { useIsAuthenticated } from '@/features/auth/store';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';

/**
 * Save toggle.
 *
 * Signed out, it does not disappear or silently fail — it says what is needed.
 * A control that vanishes when you are not signed in teaches nothing; one that
 * explains itself converts.
 */
export function SaveButton({
  placeId,
  isSaved,
  onRequireAuth,
  variant = 'icon',
  className,
}: {
  placeId: string;
  isSaved: boolean;
  onRequireAuth?: () => void;
  variant?: 'icon' | 'labelled';
  className?: string;
}) {
  const t = useT();
  const isAuthenticated = useIsAuthenticated();
  const toggle = useToggleSave(placeId);

  const handleClick = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    toggle.mutate(!isSaved);
  };

  const label = isSaved ? t('saved.removeAction') : t('saved.add');

  if (variant === 'labelled') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSaved}
        aria-label={label}
        className={cn(
          'inline-flex h-12 items-center gap-2 rounded-md px-4 text-sm font-medium',
          'transition-transform active:scale-[0.97]',
          className,
          // Last, so it survives whatever the caller passed. See below.
          isSaved ? 'bg-primary-tint text-primary' : 'bg-surface-sunken text-ink',
        )}
      >
        <Bookmark className={cn('size-[1.125rem]', isSaved && 'fill-current')} aria-hidden />
        {isSaved ? t('saved.saved') : t('saved.save')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={label}
      className={cn(
        'flex size-10 items-center justify-center rounded-full shadow-md backdrop-blur-md',
        'transition-transform active:scale-90',
        className,
        /*
         * The colours come last, after the caller's overrides, because they
         * are not decoration — they are the state.
         *
         * The detail page passed `bg-surface` to match the share button beside
         * it, `tailwind-merge` gave the later class the win, and the saved
         * state rendered a white bookmark on a white circle. Measured: filled,
         * `aria-pressed="true"`, and completely invisible. Layout is the
         * caller's to override; whether this looks saved is not.
         */
        isSaved ? 'bg-primary text-white' : 'bg-surface/85 text-ink',
      )}
    >
      <Bookmark className={cn('size-5', isSaved && 'fill-current')} aria-hidden />
    </button>
  );
}
