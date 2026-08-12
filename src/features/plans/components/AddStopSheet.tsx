'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { fetchSavedPlaces } from '@/features/favorites/api';
import { searchPlaces } from '@/features/places/api';
import { useLocationStore } from '@/features/location/store';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { categoryName } from '@/features/categories/name';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard } from '@/features/places/api';
import { useAddStop } from '../hooks/usePlans';

const MIN_QUERY = 2;

/**
 * Where a stop comes from.
 *
 * Saved places lead, because the whole reason Saved moved under the profile is
 * that its real job was feeding this list — a shortlist is what you build a day
 * out of. Search is there for everything that never got saved.
 */
export function AddStopSheet({
  planId,
  open,
  onOpenChange,
  existingPlaceIds,
}: {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPlaceIds: string[];
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} className="h-[82dvh]">
      {open && (
        <AddStopBody
          planId={planId}
          existingPlaceIds={existingPlaceIds}
          onAdded={() => {
            onOpenChange(false);
          }}
        />
      )}
    </BottomSheet>
  );
}

function AddStopBody({
  planId,
  existingPlaceIds,
  onAdded,
}: {
  planId: string;
  existingPlaceIds: string[];
  onAdded: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const describeError = useErrorMessage();
  const coordinates = useLocationStore((state) => state.coordinates);
  const addStop = useAddStop(planId);

  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const isSearching = debounced.trim().length >= MIN_QUERY;

  const saved = useQuery({
    queryKey: ['favorites', 'for-plan'],
    queryFn: () => fetchSavedPlaces(coordinates),
    enabled: !isSearching,
  });

  const results = useQuery({
    queryKey: ['places', 'search', debounced.trim(), 'for-plan'],
    queryFn: () => searchPlaces(debounced.trim(), coordinates),
    enabled: isSearching,
  });

  const places: PlaceCard[] = isSearching ? (results.data ?? []) : (saved.data?.data ?? []);
  const isPending = isSearching ? results.isPending : saved.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-4 pb-3">
        <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
          {t('plan.addPlace')}
        </Drawer.Title>

        <div className="bg-surface-sunken mt-3 flex h-12 items-center gap-2.5 rounded-md px-3.5">
          <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t('plan.addBySearch')}
            aria-label={t('plan.addBySearch')}
            className="text-ink placeholder:text-ink-subtle w-full bg-transparent text-md outline-none"
          />
        </div>

        {!isSearching && (
          <p className="text-ink-subtle mt-2.5 text-xs font-medium">{t('plan.addFromSaved')}</p>
        )}
      </div>

      {addStop.error != null && (
        <p role="alert" className="bg-danger/10 text-danger mx-5 mb-2 rounded-md p-3 text-sm">
          {describeError(addStop.error)}
        </p>
      )}

      <div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="bg-surface-sunken h-16 animate-pulse rounded-md" />
            ))}
          </div>
        )}

        {!isPending && places.length === 0 && (
          <p className="text-ink-muted py-10 text-center text-sm">
            {isSearching ? t('search.nothingFound', { query: debounced.trim() }) : t('plan.noSaved')}
          </p>
        )}

        <ul className="space-y-1 pb-6">
          {places.map((place) => {
            const already = existingPlaceIds.includes(place.id);

            return (
              <li key={place.id}>
                <button
                  type="button"
                  disabled={already || addStop.isPending}
                  onClick={() => {
                    addStop.mutate({ placeId: place.id }, { onSuccess: onAdded });
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md p-2 text-left',
                    'active:bg-surface-sunken disabled:opacity-55',
                  )}
                >
                  <div className="bg-surface-sunken relative size-12 shrink-0 overflow-hidden rounded-sm">
                    <PlaceImage
                      url={place.coverImageUrl}
                      blurhash={place.coverBlurhash}
                      name={place.name}
                      categoryIconKey={place.category.iconKey}
                      categoryColor={place.category.colorHex}
                      sizes="48px"
                      fallbackSize="sm"
                    />
                  </div>

                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-sm font-medium">
                      {place.name}
                    </span>
                    <span className="text-ink-subtle block truncate text-xs">
                      {categoryName(place.category, locale)} ·{' '}
                      {place.district ?? place.province}
                    </span>
                  </span>

                  {/* Shown rather than hidden: a place missing from the list
                      with no explanation reads as a search that failed. */}
                  {already && (
                    <span className="text-ink-subtle inline-flex shrink-0 items-center gap-1 text-xs">
                      <Check className="size-3.5" aria-hidden />
                      {t('plan.alreadyInPlan')}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
