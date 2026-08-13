'use client';

import { useEffect } from 'react';
import { ChevronDown, MapPin, LoaderCircle, MapPinOff } from 'lucide-react';
import { useLocationStore, useShouldAutoLocate } from '../store';
import { useLocationLabel } from '../useLocationLabel';
import { useOnboardingPending } from '@/features/onboarding/store';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber } from '@/i18n/format';
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
  const t = useT();
  const locale = useLocale();
  const { status, source, coordinates, label, requestLocation } = useLocationStore();
  const onboarding = useOnboardingPending();
  const shouldAutoLocate = useShouldAutoLocate();

  // Turns the fix into an address. No-op unless there is a GPS position with
  // nothing to call it yet, so the several chips on a screen share one lookup.
  useLocationLabel();

  useEffect(() => {
    // Only auto-prompt from a cold start. Re-asking after a denial is both
    // futile — browsers remember the decision — and hostile.
    //
    // And never while onboarding is up: the browser dialog would appear behind
    // the overlay, unexplained, and the reflex answer to that is No — which is
    // the one answer that cannot be asked again.
    if (shouldAutoLocate && !onboarding) void requestLocation();
  }, [shouldAutoLocate, onboarding, requestLocation]);

  /*
   * Only alarming when there is genuinely nothing to work with.
   *
   * A refusal with a position already in hand — one the reader chose, or the
   * last one we had — is not a state that needs an orange chip and a
   * crossed-out pin. The label says "last known" where that is what it is,
   * which is the honest part; the colour was just shouting.
   */
  const isDenied = (status === 'DENIED' || status === 'UNAVAILABLE') && coordinates === null;
  const isPrompting = status === 'PROMPTING';

  const text = (() => {
    if (isPrompting) return t('location.finding');
    if (label) return label;
    if (coordinates) {
      // Formatted for the locale: the decimal mark is a comma in Vietnamese,
      // and a coordinate is the one place on this screen where mixing the two
      // conventions is most obvious.
      const point = `${formatCoordinate(coordinates.latitude)}, ${formatCoordinate(coordinates.longitude)}`;
      return source === 'LAST_KNOWN' ? t('location.lastKnown', { coordinates: point }) : point;
    }
    if (isDenied) return t('location.choose');
    return t('location.locating');
  })();

  function formatCoordinate(value: number): string {
    return formatNumber(Math.round(value * 1000) / 1000, locale);
  }

  const Icon = isPrompting ? LoaderCircle : isDenied ? MapPinOff : MapPin;

  /*
   * Tapping opens the picker.
   *
   * It used to re-request GPS, which meant that once permission was granted
   * the control did nothing visible and there was no way in the app to look
   * somewhere else — the picker existed but only a refusal could reach it.
   * Being in Gò Vấp and planning an evening in District 1 is not an error
   * state, and it was the one thing this chip could not express.
   *
   * The GPS request stays as the fallback for callers with no picker to open,
   * and the picker itself offers "use my current location" first.
   */
  const handleClick = () => {
    if (onPickLocation) {
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
          {t('location.myLocation')}
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
        <span className="mt-0.5 flex max-w-full items-center gap-1">
          <Icon
            className={cn(
              'size-4 shrink-0',
              isDenied ? 'text-warning' : 'text-primary',
              isPrompting && 'animate-spin',
            )}
            aria-hidden
          />
          <span className="truncate text-md font-semibold text-ink">{text}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5',
        'text-sm font-medium press-soft',
        isDenied ? 'bg-warning/10 text-warning' : 'bg-primary-tint text-primary',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isPrompting && 'animate-spin')} aria-hidden />
      <span className="truncate">{text}</span>
    </button>
  );
}
