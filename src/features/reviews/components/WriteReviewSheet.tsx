'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { StarInput } from './StarInput';
import { Button } from '@/components/ui/Button';
import { useCreateReview, useUpdateReview } from '../hooks/useReviews';
import { ApiError } from '@/lib/api/errors';
import type { Review } from '../api';

const MAX_LENGTH = 2000;

export function WriteReviewSheet({
  open,
  onOpenChange,
  placeId,
  placeName,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
  placeName: string;
  /** Present when editing rather than writing. */
  existing?: Review | null;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="bg-ink/40 fixed inset-0 z-50 backdrop-blur-[2px]" />
        <Drawer.Content className="px-safe border-border bg-surface shadow-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-t focus:outline-none">
          <div className="bg-border mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" />

          {/*
            Remounted per target rather than syncing state from props in an
            effect. The sheet stays mounted between uses, so without this the
            form would open showing whatever was typed last time — and seeding
            it from an effect causes a cascading render on every open.
          */}
          {open && (
            <ReviewForm
              key={existing?.id ?? 'new'}
              placeId={placeId}
              placeName={placeName}
              existing={existing ?? null}
              onDone={() => {
                onOpenChange(false);
              }}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ReviewForm({
  placeId,
  placeName,
  existing,
  onDone,
}: {
  placeId: string;
  placeName: string;
  existing: Review | null;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? '');

  const create = useCreateReview(placeId);
  const update = useUpdateReview(placeId);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = () => {
    if (rating === 0) return;

    if (existing) {
      update.mutate(
        { reviewId: existing.id, rating, content: content.trim() || null },
        { onSuccess: onDone },
      );
    } else {
      create.mutate(
        { rating, ...(content.trim() ? { content: content.trim() } : {}) },
        { onSuccess: onDone },
      );
    }
  };

  return (
    <div className="pb-safe overflow-y-auto px-5 pt-4">
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {existing ? 'Edit your review' : 'Rate this place'}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">{placeName}</Drawer.Description>

      <div className="mt-5 flex justify-center">
        <StarInput value={rating} onChange={setRating} disabled={pending} />
      </div>

      <label htmlFor="review-content" className="text-ink mt-5 block text-sm font-semibold">
        Tell people more <span className="text-ink-subtle font-normal">(optional)</span>
      </label>
      <textarea
        id="review-content"
        value={content}
        onChange={(event) => {
          setContent(event.target.value.slice(0, MAX_LENGTH));
        }}
        rows={5}
        disabled={pending}
        placeholder="What stood out? Anything worth knowing before going?"
        className="bg-surface-sunken text-ink placeholder:text-ink-subtle focus-visible:outline-primary mt-2 w-full resize-none rounded-md p-3.5 text-[0.9375rem] leading-relaxed outline-none focus-visible:outline-2"
      />
      <p className="text-ink-subtle mt-1 text-right text-xs">
        {content.length}/{MAX_LENGTH}
      </p>

      {error && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {error instanceof ApiError ? error.message : 'Could not save your review.'}
        </p>
      )}

      <Button
        fullWidth
        size="lg"
        className="mt-4"
        // Disabled until a rating is chosen: a review with no rating
        // contributes nothing to the number people actually read.
        disabled={rating === 0}
        isLoading={pending}
        onClick={submit}
      >
        {existing ? 'Save changes' : 'Post review'}
      </Button>

      <p className="text-ink-subtle mt-3 pb-4 text-center text-xs leading-relaxed">
        {existing
          ? 'Reviews can be edited for 24 hours after posting.'
          : 'Your review is public and shows your name.'}
      </p>
    </div>
  );
}
