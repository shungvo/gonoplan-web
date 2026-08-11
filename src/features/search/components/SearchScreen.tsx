'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Search, TrendingUp, X } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import { fetchCategories } from '@/features/categories/api';
import { PlaceListItem, PlaceListItemSkeleton } from '@/features/places/components/PlaceListItem';
import { PlaceSheet } from '@/features/places/components/PlaceSheet';
import { searchPlaces } from '@/features/places/api';
import { useLocationStore } from '@/features/location/store';
import { searchCities } from '@/features/location/cities';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { categoryName } from '@/features/categories/name';
import { queryKeys } from '@/lib/query/keys';
import { useRecentSearches } from '../store';
import { fetchPopularSearches } from '../api';
import { BackButton } from '@/components/ui/BackButton';

const MIN_QUERY_LENGTH = 2;

/**
 * Search (§19).
 *
 * One input drives three kinds of result: places, categories, and cities. A
 * traveller typing "da nang" wants to move the whole app there, not to find a
 * place called Da Nang — so cities are offered as an action rather than buried
 * among place results.
 */
export function SearchScreen() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const coordinates = useLocationStore((state) => state.coordinates);
  const setManualLocation = useLocationStore((state) => state.setManualLocation);
  const { recent, remember, forget, clear } = useRecentSearches();

  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    // The user navigated here to type. Anything else costs an extra tap.
    inputRef.current?.focus();
  }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: queryKeys.places.search(debouncedQuery.trim(), coordinates),
    queryFn: () => searchPlaces(debouncedQuery.trim(), coordinates),
    enabled: isSearching,
    staleTime: 60_000,
  });

  const { data: popular } = useQuery({
    queryKey: ['search', 'popular'],
    queryFn: () => fetchPopularSearches(8),
    staleTime: 10 * 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  // Matched locally: the city list is small, already loaded, and this must keep
  // working on the bad connection that made someone search in the first place.
  const cityMatches = isSearching ? searchCities(debouncedQuery.trim()).slice(0, 3) : [];

  // Remember only searches that found something. Recording a typo that returned
  // nothing would suggest it back to the user later.
  useEffect(() => {
    if (isSearching && results && results.length > 0) remember(debouncedQuery.trim());
  }, [isSearching, results, debouncedQuery, remember]);

  const runSearch = (next: string) => {
    setQuery(next);
    inputRef.current?.focus();
  };

  const showSuggestions = !isSearching;
  const hasNoResults =
    isSearching && !isFetching && results?.length === 0 && cityMatches.length === 0;

  return (
    <div className="px-safe flex min-h-dvh flex-col">
      <header className="bg-background/95 pt-safe sticky top-0 z-10 px-5 backdrop-blur-md">
        <div className="flex items-center gap-2 pt-3 pb-3">
          <BackButton
            compact
            onClick={() => {
              router.back();
            }}
          />

          <div className="bg-surface flex h-12 flex-1 items-center gap-2.5 rounded-md px-3.5 shadow-sm">
            <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              // `search` shows a "Search" key on mobile keyboards; results are
              // already live, so submitting only needs to dismiss the keyboard.
              enterKeyHint="search"
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              className="text-ink placeholder:text-ink-subtle w-full bg-transparent text-[0.9375rem] outline-none"
            />
            {query.length > 0 && (
              <button
                type="button"
                aria-label={t('search.clear')}
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="bg-surface-sunken text-ink-muted flex size-6 shrink-0 items-center justify-center rounded-full"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 pb-6">
        {showSuggestions && (
          <div className="space-y-6 pt-2">
            {recent.length > 0 && (
              <section aria-label={t('search.recentSearches')}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-ink text-sm font-semibold">{t('search.recent')}</h2>
                  <button
                    type="button"
                    onClick={clear}
                    className="text-ink-subtle text-xs font-medium"
                  >
                    {t('common.clear')}
                  </button>
                </div>
                <ul className="mt-2">
                  {recent.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          runSearch(item);
                        }}
                        // `min-w-0` or the `truncate` below never fires: a flex
                        // item is floored at its min-content width, and
                        // `truncate` sets `white-space: nowrap`, which makes
                        // that the whole string. A long enough recent search
                        // pushed the remove button 197px off the screen — the
                        // entry became impossible to delete.
                        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                      >
                        <Clock className="text-ink-subtle size-4 shrink-0" aria-hidden />
                        <span className="text-ink truncate text-[0.9375rem]">{item}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={t('search.removeRecent', { query: item })}
                        onClick={() => {
                          forget(item);
                        }}
                        className="text-ink-subtle flex size-8 shrink-0 items-center justify-center"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Real aggregated searches when there are any. Until then the
                category grid below serves the same purpose honestly, rather
                than inventing a "popular" list nobody has searched for. */}
            {popular && popular.length > 0 && (
              <section aria-label={t('search.popularSearches')}>
                <h2 className="text-ink flex items-center gap-1.5 text-sm font-semibold">
                  <TrendingUp className="text-ink-subtle size-4" aria-hidden />
                  {t('search.popular')}
                </h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {popular.map((item) => (
                    <Chip
                      key={item.query}
                      onClick={() => {
                        runSearch(item.query);
                      }}
                    >
                      {item.query}
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            <section aria-label={t('search.browseCategory')}>
              <h2 className="text-ink text-sm font-semibold">{t('search.browseCategory')}</h2>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {/* Empty categories are hidden: tapping one is a guaranteed
                    dead end, and "Other · 0 places" is an invitation to a
                    blank screen. They reappear as soon as they have places. */}
                {categories
                  ?.filter((category) => category.placeCount > 0)
                  .map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        runSearch(categoryName(category, locale));
                      }}
                      className="bg-surface flex items-center gap-3 rounded-lg p-3 text-left shadow-sm active:scale-[0.98]"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-sm"
                        style={{ backgroundColor: `${category.colorHex}1f` }}
                      >
                        <CategoryGlyph
                          slug={category.slug}
                          color={category.colorHex}
                          className="size-[1.125rem]"
                          strokeWidth={2}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="text-ink block truncate text-sm font-medium">
                          {categoryName(category, locale)}
                        </span>
                        <span className="text-ink-subtle block truncate text-xs">
                          {t('search.placeCount', { count: category.placeCount })}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </div>
        )}

        {isSearching && (
          <div className="space-y-4 pt-2">
            {cityMatches.length > 0 && (
              <section aria-label={t('search.cities')}>
                <h2 className="text-ink text-sm font-semibold">{t('search.goToCity')}</h2>
                <ul className="mt-2 space-y-2">
                  {cityMatches.map((city) => (
                    <li key={city.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          // Moves the whole app, then returns to it — the point
                          // of searching a city is to browse there.
                          setManualLocation(
                            { latitude: city.latitude, longitude: city.longitude },
                            city.name,
                          );
                          router.push('/');
                        }}
                        className="bg-surface flex w-full items-center gap-3 rounded-lg p-3 text-left shadow-sm active:scale-[0.99]"
                      >
                        <span className="bg-primary-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-sm">
                          <MapPin className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="text-ink block truncate text-[0.9375rem] font-medium">
                            {city.name}
                          </span>
                          <span className="text-ink-muted block truncate text-xs">
                            {t('search.browseIn', { city: city.nameVi })}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isFetching && !results && (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <PlaceListItemSkeleton key={index} />
                ))}
              </div>
            )}

            {results && results.length > 0 && (
              <section aria-label={t('search.results')}>
                <h2 className="text-ink text-sm font-semibold">
                  {t('search.resultCount', { count: results.length })}
                </h2>
                <ul className="mt-2 space-y-2.5">
                  {results.map((place) => (
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
              </section>
            )}

            {hasNoResults && (
              <EmptyState
                icon={<Search className="size-7" aria-hidden />}
                title={t('search.nothingFound', { query: debouncedQuery.trim() })}
                description={t('search.nothingFoundHint')}
              />
            )}
          </div>
        )}
      </div>

      <PlaceSheet
        placeId={selectedPlaceId}
        onClose={() => {
          setSelectedPlaceId(null);
        }}
      />
    </div>
  );
}
