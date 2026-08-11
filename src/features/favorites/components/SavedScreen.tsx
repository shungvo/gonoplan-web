'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  PlaceListItem,
  PlaceListItemSkeleton,
} from '@/features/places/components/PlaceListItem';
import { PlaceSheet } from '@/features/places/components/PlaceSheet';
import { useIsAuthenticated } from '@/features/auth/store';
import { useT } from '@/i18n/I18nProvider';
import { useSavedPlaces } from '../hooks/useFavorites';

/**
 * The Saved tab (§18).
 *
 * Three distinct states, each designed rather than defaulted: signed out,
 * signed in with nothing saved, and a list. Collapsing the first two into one
 * "nothing here" screen would tell a signed-out visitor their saves are gone.
 */
export function SavedScreen() {
  const t = useT();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { data, isPending } = useSavedPlaces();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const places = data?.data ?? [];

  return (
    <div className="px-safe">
      <header className="pt-safe px-5">
        <h1 className="text-ink pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t('saved.title')}
        </h1>
        {isAuthenticated && places.length > 0 && (
          <p className="text-ink-muted mt-1 text-sm">
            {t('saved.count', { count: places.length })}
          </p>
        )}
      </header>

      <div className="mt-4 px-5">
        {!isAuthenticated && (
          <EmptyState
            icon={<Bookmark className="size-7" aria-hidden />}
            title={t('saved.signedOutTitle')}
            description={t('saved.signedOutDescription')}
            action={
              <Button
                onClick={() => {
                  router.push('/profile');
                }}
              >
                {t('common.signIn')}
              </Button>
            }
          />
        )}

        {isAuthenticated && isPending && (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }, (_, index) => (
              <PlaceListItemSkeleton key={index} />
            ))}
          </div>
        )}

        {isAuthenticated && !isPending && places.length === 0 && (
          <EmptyState
            icon={<Bookmark className="size-7" aria-hidden />}
            title={t('saved.emptyTitle')}
            description={t('saved.emptyDescription')}
            action={
              <Button
                variant="secondary"
                leadingIcon={<Compass className="size-4" aria-hidden />}
                onClick={() => {
                  router.push('/explore');
                }}
              >
                {t('saved.explore')}
              </Button>
            }
          />
        )}

        {isAuthenticated && places.length > 0 && (
          <ul className="space-y-2.5">
            {places.map((place) => (
              <li key={place.id}>
                <PlaceListItem
                  place={place}
                  onSelect={() => {
                    setSelectedPlaceId(place.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-6" />

      <PlaceSheet
        placeId={selectedPlaceId}
        onClose={() => {
          setSelectedPlaceId(null);
        }}
      />
    </div>
  );
}
