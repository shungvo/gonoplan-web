'use client';

import { useEffect } from 'react';
import { ChevronDown, MapPin, LoaderCircle, MapPinOff } from 'lucide-react';
import { useLocationStore } from '../store';
import { cn } from '@/lib/utils/cn';

/**
 * Surfaces the location state machine honestly.
 *
 * Every branch is a designed state — including refusal. §34: if the user says
 * no, the app keeps working and offers to let them pick a city instead.
 */
export function LocationChip({
  onPickLocation,
  variant = 'chip',
}: {
  onPickLocation?: (() => void) | undefined;
  /**
   * `header` is the two-line centred form: a quiet "My Location" caption over
   * the place itself. A variant rather than a second component, because every
   * branch below — prompting, denied, last-known — is state this already owns,
   * and a copy of it would drift the moment one of them changed.
   */
  variant?: 'chip' | 'header';
} = {}) {
  const { status, source, coordinates, label, requestLocation } = useLocationStore();

  useEffect(() => {
    // Only auto-prompt from a cold start. Re-asking after a denial is both
    // futile — browsers remember the decision — and hostile.
    if (status === 'IDLE') void requestLocation();
  }, [status, requestLocation]);

  const isDenied = status === 'DENIED' || status === 'UNAVAILABLE';
  const isPrompting = status === 'PROMPTING';

  const text = (() => {
    if (isPrompting) return 'Finding you…';
    if (label) return label;
    if (coordinates) {
      const suffix = source === 'LAST_KNOWN' ? ' (last known)' : '';
      return `${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}${suffix}`;
    }
    if (isDenied) return 'Choose your location';
    return 'Locating…';
  })();

  const Icon = isPrompting ? LoaderCircle : isDenied ? MapPinOff : MapPin;

  const handleClick = () => {
    // Re-prompting after a denial does nothing — the browser remembers it.
    // Offer the manual picker instead of a button that appears broken.
    if (isDenied && onPickLocation) {
      onPickLocation();
      return;
    }
    void requestLocation();
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 flex-col items-center px-2"
      >
        <span className="flex items-center gap-0.5 text-xs text-ink-muted">
          My location
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
        <span className="mt-0.5 flex max-w-full items-center gap-1">
          <Icon
            className={cn(
              'size-4 shrink-0',
              isDenied ? 'text-accent' : 'text-primary',
              isPrompting && 'animate-spin',
            )}
            aria-hidden
          />
          <span className="truncate text-[0.9375rem] font-semibold text-ink">{text}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        // Re-prompting after a denial does nothing — the browser remembers it.
        // Offer the manual picker instead of a button that appears broken.
        if (isDenied && onPickLocation) {
          onPickLocation();
          return;
        }
        void requestLocation();
      }}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5',
        'text-sm font-medium transition-colors active:scale-[0.98]',
        isDenied ? 'bg-accent-tint text-accent' : 'bg-primary-tint text-primary',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isPrompting && 'animate-spin')} aria-hidden />
      <span className="truncate">{text}</span>
    </button>
  );
}
