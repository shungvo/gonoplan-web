'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

  const goBack = () => {
    // A shared link has no history to go back to, so fall back to home rather
    // than leaving the button dead.
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div className="px-safe relative">
      {/*
        Floats over the hero (§21) and scrolls away with it.
        `fixed` kept it pinned over the body copy, where it sat directly on top
        of the "Reviews" heading. It belongs to the hero; once the user is
        reading, the swipe-back gesture and the bottom nav are the way out.
      */}
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="bg-surface/85 text-ink absolute top-[calc(env(safe-area-inset-top,0px)+0.75rem)] left-4 z-10 flex size-10 items-center justify-center rounded-full shadow-md backdrop-blur-md active:scale-95"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>

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
    </div>
  );
}
