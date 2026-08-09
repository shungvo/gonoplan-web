'use client';

import { useEffect } from 'react';
import { MapPin, LoaderCircle, MapPinOff } from 'lucide-react';
import { useLocationStore } from '../store';
import { cn } from '@/lib/utils/cn';

/**
 * Surfaces the location state machine honestly.
 *
 * Every branch is a designed state — including refusal. §34: if the user says
 * no, the app keeps working and offers to let them pick a city instead.
 */
export function LocationChip() {
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

  return (
    <button
      type="button"
      onClick={() => void requestLocation()}
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
