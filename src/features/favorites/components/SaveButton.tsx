'use client';

import { Bookmark } from 'lucide-react';
import { useToggleSave } from '../hooks/useFavorites';
import { useIsAuthenticated } from '@/features/auth/store';
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
  const isAuthenticated = useIsAuthenticated();
  const toggle = useToggleSave(placeId);

  const handleClick = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    toggle.mutate(!isSaved);
  };

  const label = isSaved ? 'Remove from saved' : 'Save this place';

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
          isSaved ? 'bg-primary-tint text-primary' : 'bg-surface-sunken text-ink',
          className,
        )}
      >
        <Bookmark className={cn('size-[1.125rem]', isSaved && 'fill-current')} aria-hidden />
        {isSaved ? 'Saved' : 'Save'}
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
        isSaved ? 'bg-primary text-white' : 'bg-surface/85 text-ink',
        className,
      )}
    >
      <Bookmark className={cn('size-5', isSaved && 'fill-current')} aria-hidden />
    </button>
  );
}
