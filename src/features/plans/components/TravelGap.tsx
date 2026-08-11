'use client';

import { CornerDownRight, TriangleAlert } from 'lucide-react';
import { useDirections, formatDuration } from '@/features/geo/useDirections';
import { formatDistance } from '@/lib/geo/grid';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';

/**
 * The hop between two stops.
 *
 * A component per gap rather than a loop of `useDirections` in the parent:
 * hooks have to be called in the same order every render, and the number of
 * gaps changes every time somebody adds or removes a place.
 *
 * This is what makes an ordered list into a plan. Without it, 14:00 in
 * District 1 and 14:30 in Thủ Đức look like a perfectly reasonable afternoon,
 * and nothing on the screen says otherwise until the day itself does.
 */
export function TravelGap({
  from,
  to,
  /** Minutes the plan leaves for this hop, when both stops carry a time. */
  allowedMinutes,
}: {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  allowedMinutes: number | null;
}) {
  const t = useT();
  const locale = useLocale();
  const directions = useDirections(from, to);

  const neededMinutes = directions.data
    ? Math.round(directions.data.durationS / 60)
    : null;

  /*
   * Flagged only when the plan actually claims a time for both ends.
   *
   * Two stops with no clock attached are an ordering, and an ordering cannot
   * be too tight. Warning there would put a red triangle on half the days
   * anybody drafts.
   */
  const tooTight =
    allowedMinutes !== null && neededMinutes !== null && neededMinutes > allowedMinutes;

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 pl-[3.25rem] text-xs',
        tooTight ? 'text-danger' : 'text-ink-subtle',
      )}
    >
      {tooTight ? (
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
      )}

      {directions.isPending && <span className="opacity-60">···</span>}

      {directions.data && (
        <span>
          {t('plan.travel', {
            duration: formatDuration(directions.data.durationS, locale),
            distance: formatDistance(directions.data.distanceM, locale),
          })}
          {tooTight && ` · ${t('plan.tooFar')}`}
        </span>
      )}

      {/* A pair with no drivable route between them is an ordinary answer for
          an island or a pedestrian street, not a failure worth an error state. */}
      {directions.error != null && <span>{t('plan.travelUnknown')}</span>}
    </div>
  );
}
