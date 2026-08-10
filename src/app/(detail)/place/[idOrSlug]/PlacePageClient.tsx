'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Share2 } from 'lucide-react';
import { SaveButton } from '@/features/favorites/components/SaveButton';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { PlaceDetailContent } from '@/features/places/components/PlaceDetailContent';
import { usePlaceDetail } from '@/features/places/hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * Full-page place detail, for shared links and direct navigation.
 *
 * Renders the same `PlaceDetailContent` as the bottom sheet. A separate
 * "detail page" implementation would drift from the sheet within two features.
 */
export function PlacePageClient({ idOrSlug }: { idOrSlug: string }) {
  const router = useRouter();
  const coordinates = useLocationStore((state) => state.coordinates);

  const { data: place, isPending, error } = usePlaceDetail(idOrSlug, coordinates);
  const [authOpen, setAuthOpen] = useState(false);

  const share = async () => {
    if (!place) return;
    const url = `${window.location.origin}/place/${place.slug}`;
    if (navigator.share) {
      // The user cancelling the share sheet rejects this promise, and that is
      // not an error worth surfacing.
      await navigator.share({ title: place.name, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
  };

  const goBack = () => {
    // A shared link has no history to go back to, so fall back to home rather
    // than leaving the button dead.
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div className="px-safe relative">
      {/*
        Header row above the photo, not floating on top of it.

        It used to sit over the hero, which meant its legibility depended on
        whatever the photograph happened to be behind it. Above the image it is
        always readable, and the actions that were competing with the primary
        CTA lower down — save and share — live here instead, where they read as
        secondary because of where they are rather than because of their size.
      */}
      <header className="pt-safe flex items-center justify-between gap-3 px-4 pt-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface pr-4 pl-3 text-sm font-medium text-ink shadow-sm active:scale-95"
        >
          <ChevronLeft className="size-5" aria-hidden />
          Back
        </button>

        <div className="flex items-center gap-2">
          {place && (
            <SaveButton
              placeId={place.id}
              isSaved={place.isSaved}
              onRequireAuth={() => {
                setAuthOpen(true);
              }}
              className="size-10 rounded-full bg-surface shadow-sm"
            />
          )}
          <button
            type="button"
            onClick={() => {
              void share();
            }}
            aria-label="Share this place"
            disabled={!place}
            className="flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Share2 className="size-[1.125rem]" aria-hidden />
          </button>
        </div>
      </header>

      {isPending && (
        <div>
          <div className="aspect-[4/3] max-h-[46dvh] w-full animate-pulse bg-surface-sunken" />
          <div className="space-y-3 px-5 pt-4">
            <div className="h-5 w-24 animate-pulse rounded-full bg-surface-sunken" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-surface-sunken" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-sunken" />
          </div>
        </div>
      )}

      {error && (
        <EmptyState
          className="pt-24"
          title={
            error instanceof ApiError && error.status === 404
              ? 'This place is no longer available'
              : 'Could not load this place'
          }
          description={
            error instanceof ApiError && error.status === 404
              ? 'It may have been removed, or the link may be out of date.'
              : 'Check your connection and try again.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                router.push('/');
              }}
            >
              Back to Gonoplan
            </Button>
          }
        />
      )}

      {place && <PlaceDetailContent place={place} />}

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="Sign in to save places and come back to them later."
      />
    </div>
  );
}
