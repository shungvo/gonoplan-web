'use client';

import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/field';
import { PhotoPicker, type PickedPhoto } from '@/features/uploads/components/PhotoPicker';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { useSavedPlaces } from '@/features/favorites/hooks/useFavorites';
import { useNearbyPlaces } from '@/features/places/hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard } from '@/features/places/api';
import { useCreateCheckIn } from '../hooks';

const MAX_CAPTION = 300;
const MAX_PHOTOS = 6;

const FALLBACK_ORIGIN = { latitude: 10.7769, longitude: 106.7009 };

/**
 * Post a photograph from somewhere.
 *
 * Place first, then photographs, then words — in that order on purpose. The
 * place is the one field with no sensible default and the only one that
 * decides whether the post means anything, so asking for it last would mean
 * discovering at the end that you have to go and find it.
 */
export function CheckInComposer({
  userId,
  onPosted,
}: {
  userId: string | undefined;
  onPosted: () => void;
}) {
  const t = useT();
  const describeError = useErrorMessage();
  const coordinates = useLocationStore((state) => state.coordinates);

  const [place, setPlace] = useState<PlaceCard | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [query, setQuery] = useState('');

  const create = useCreateCheckIn(userId);

  /*
   * Saved first, then what is nearby.
   *
   * Somebody posting a photograph has just been somewhere, and the two lists
   * most likely to contain it are the places they already chose and the places
   * within walking distance. A search box alone would make the common case —
   * "the cafe I am sitting in" — the slowest one.
   */
  const saved = useSavedPlaces();
  const nearby = useNearbyPlaces(coordinates ?? FALLBACK_ORIGIN, { limit: 12 });

  const candidates: PlaceCard[] = (() => {
    const merged = [...(saved.data?.data ?? []), ...(nearby.data?.places ?? [])];
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const needle = query.trim().toLowerCase();
    if (!needle) return unique.slice(0, 20);
    return unique.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 20);
  })();

  const canPost = place !== null && photos.length > 0 && !create.isPending;

  const submit = () => {
    if (!place) return;

    create.mutate(
      {
        placeId: place.id,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
        imageKeys: photos.map((photo) => photo.key),
      },
      {
        onSuccess: () => {
          setPlace(null);
          setPhotos([]);
          setCaption('');
          setQuery('');
          onPosted();
        },
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Drawer.Title className="text-ink shrink-0 px-5 pt-1 text-lg font-semibold">
        {t('checkin.composeTitle')}
      </Drawer.Title>

      <div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
        <label className="block">
          <span className="text-ink-muted text-xs font-medium">{t('checkin.where')}</span>
          <span className="relative mt-1.5 flex items-center">
            <Search
              className="text-ink-subtle pointer-events-none absolute left-3 size-4"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t('checkin.wherePlaceholder')}
              className={fieldClass('h-11 pr-3 pl-9 text-sm')}
            />
          </span>
        </label>

        {/* A row, not a dropdown. The candidates all have a photograph, and a
            photograph is how somebody recognises the place they are standing
            in — a list of names would make them read where they already are. */}
        <ul className="-mx-5 mt-3 flex scrollbar-none gap-2 overflow-x-auto px-5 pb-1">
          {candidates.map((candidate) => {
            const isChosen = place?.id === candidate.id;

            return (
              <li key={candidate.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPlace(isChosen ? null : candidate);
                  }}
                  aria-pressed={isChosen}
                  className={cn(
                    'press-surface block w-28 text-left',
                    isChosen ? 'opacity-100' : 'opacity-95',
                  )}
                >
                  <span
                    className={cn(
                      'bg-surface-sunken relative block aspect-square w-full overflow-hidden rounded-md',
                      isChosen && 'ring-ink ring-offset-surface ring-2 ring-offset-2',
                    )}
                  >
                    <PlaceImage
                      url={candidate.coverImageUrl}
                      blurhash={candidate.coverBlurhash}
                      name={candidate.name}
                      categoryIconKey={candidate.category.iconKey}
                      categoryColor={candidate.category.colorHex}
                      sizes="112px"
                      fallbackSize="sm"
                    />
                    {isChosen && (
                      <span className="bg-ink absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full text-white">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="text-ink mt-1.5 line-clamp-2 block text-xs font-medium">
                    {candidate.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {candidates.length === 0 && (
          <p className="text-ink-subtle mt-3 text-sm">{t('checkin.noPlaces')}</p>
        )}

        <div className="border-border mt-5 border-t pt-4">
          <p className="text-ink-muted text-xs font-medium">
            {t('checkin.photos', { max: MAX_PHOTOS })}
          </p>
          {/* Re-encoded in the browser before upload, which both shrinks the
              file and strips the EXIF a phone writes into it — including where
              the photo was taken. */}
          <PhotoPicker
            className="mt-2"
            photos={photos}
            onChange={setPhotos}
            purpose="checkin"
            max={MAX_PHOTOS}
            disabled={create.isPending}
          />
        </div>

        <label className="mt-5 block">
          <span className="text-ink-muted text-xs font-medium">{t('checkin.caption')}</span>
          <textarea
            value={caption}
            onChange={(event) => {
              setCaption(event.target.value.slice(0, MAX_CAPTION));
            }}
            rows={3}
            placeholder={t('checkin.captionPlaceholder')}
            disabled={create.isPending}
            className={fieldClass('mt-1.5 resize-none px-3 py-2.5 text-sm')}
          />
          <span className="text-ink-subtle mt-1 block text-right text-xs tabular-nums">
            {caption.length}/{MAX_CAPTION}
          </span>
        </label>

        {create.error && (
          <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
            {describeError(create.error)}
          </p>
        )}

        <Button
          fullWidth
          size="lg"
          className="mt-4"
          disabled={!canPost}
          isLoading={create.isPending}
          onClick={submit}
        >
          {t('checkin.post')}
        </Button>

        {/* Says which of the two required things is still missing, rather than
            leaving a disabled button with no explanation. */}
        {!canPost && !create.isPending && (
          <p className="text-ink-subtle mt-2 text-center text-xs">
            {place === null ? t('checkin.needPlace') : t('checkin.needPhoto')}
          </p>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
