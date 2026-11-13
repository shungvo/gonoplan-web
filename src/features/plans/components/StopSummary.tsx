'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { categoryName } from '@/features/categories/name';
import { categorySolid } from '@/features/categories/color';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { placeHref } from '@/lib/navigation/links';
import type { PlanStop } from '../api';

/**
 * What a stop *is*: the photograph, the name, what kind of place and where.
 *
 * The part of a stop card that is the same whether you are arranging the day
 * or reading somebody else's. Everything that differs — the time control, the
 * note field, the move buttons — is the caller's, underneath.
 *
 * Photograph on the left again. It moved right once, to give long names the
 * full measure; with the marker now out on the rail the text column is wide
 * enough for "Ho Chi Minh City Museum of Fine Arts" on two lines either way,
 * and a picture leading the row is what makes five stops scannable at a
 * glance.
 */
export function StopSummary({
  stop,
  /** One line under the area — the public page puts the street address here. */
  detail,
}: {
  stop: PlanStop;
  detail?: string | undefined;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="flex gap-3">
      <div className="bg-surface-sunken relative size-16 shrink-0 overflow-hidden rounded-lg">
        <PlaceImage
          url={stop.place.coverImageUrl}
          blurhash={stop.place.coverBlurhash}
          name={stop.place.name}
          categoryIconKey={stop.place.category.iconKey}
          categoryColor={stop.place.category.colorHex}
          sizes="64px"
          fallbackSize="sm"
        />
      </div>

      <div className="min-w-0 flex-1">
        {stop.place.isUnavailable ? (
          <p className="text-ink text-md leading-snug font-bold">{stop.place.name}</p>
        ) : (
          <Link
            href={placeHref(stop.place.slug)}
            className="text-ink text-md block leading-snug font-bold"
          >
            {stop.place.name}
          </Link>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="text-2xs inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-white"
            style={{ backgroundColor: categorySolid(stop.place.category.colorHex) }}
          >
            {categoryName(stop.place.category, locale)}
          </span>
          <span className="text-ink-subtle text-xs">
            {stop.place.district ?? stop.place.province}
          </span>
        </p>

        {detail && <p className="text-ink-muted mt-1 text-xs leading-relaxed">{detail}</p>}

        {/* Stated, never hidden. A stop that vanished from a day somebody
            arranged, with nothing to explain it, is the worse outcome. */}
        {stop.place.isUnavailable && (
          <p className="text-danger mt-1 flex items-center gap-1 text-xs">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            {t('plan.unavailable')}
          </p>
        )}
      </div>
    </div>
  );
}
