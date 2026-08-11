'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { StarInput } from './StarInput';
import { Button } from '@/components/ui/Button';
import { useCreateReview, useUpdateReview } from '../hooks/useReviews';
import { fieldClass } from '@/components/ui/field';
import { PhotoPicker, type PickedPhoto } from '@/features/uploads/components/PhotoPicker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
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
    <BottomSheet open={open} onOpenChange={onOpenChange}>
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
    </BottomSheet>
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
  const t = useT();
  const describeError = useErrorMessage();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? '');

  /*
   * Seeded from the review being edited.
   *
   * The API replaces the whole set on update rather than appending, so the
   * existing photos have to start in the list — otherwise saving an edit
   * would quietly delete every photo the review already had.
   */
  const [photos, setPhotos] = useState<PickedPhoto[]>(
    () => existing?.images.map((image) => ({ key: image.id, url: image.url })) ?? [],
  );

  const create = useCreateReview(placeId);
  const update = useUpdateReview(placeId);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = () => {
    if (rating === 0) return;

    if (existing) {
      update.mutate(
        {
          reviewId: existing.id,
          rating,
          content: content.trim() || null,
          imageKeys: photos.map((photo) => photo.key),
        },
        { onSuccess: onDone },
      );
    } else {
      create.mutate(
        {
          rating,
          ...(content.trim() ? { content: content.trim() } : {}),
          ...(photos.length ? { imageKeys: photos.map((photo) => photo.key) } : {}),
        },
        { onSuccess: onDone },
      );
    }
  };

  return (
    <div className="pb-safe overflow-y-auto px-5 pt-4">
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {existing ? t('write.editTitle') : t('write.newTitle')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">{placeName}</Drawer.Description>

      <div className="mt-5 flex justify-center">
        <StarInput value={rating} onChange={setRating} disabled={pending} />
      </div>

      <label htmlFor="review-content" className="text-ink mt-5 block text-sm font-semibold">
        {t('write.tellMore')}{' '}
        <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
      </label>
      <textarea
        id="review-content"
        value={content}
        onChange={(event) => {
          setContent(event.target.value.slice(0, MAX_LENGTH));
        }}
        rows={5}
        disabled={pending}
        placeholder={t('write.contentPlaceholder')}
        className={fieldClass('mt-2 resize-none p-3.5 text-[0.9375rem] leading-relaxed')}
      />
      <p className="text-ink-subtle mt-1 text-right text-xs">
        {content.length}/{MAX_LENGTH}
      </p>

      <p className="text-ink mt-4 text-sm font-semibold">
        {t('write.photos')}{' '}
        <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
      </p>
      {/* Re-encoded in the browser before upload, which both shrinks the file
          and strips the EXIF a phone writes into it — including where the
          photo was taken. See gonoplan-api/docs/04-storage.md §4. */}
      <PhotoPicker className="mt-2" photos={photos} onChange={setPhotos} disabled={pending} />

      {error && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {describeError(error)}
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
        {existing ? t('write.saveChanges') : t('write.post')}
      </Button>

      <p className="text-ink-subtle mt-3 pb-4 text-center text-xs leading-relaxed">
        {existing
          ? t('write.editWindow')
          : t('write.publicNotice')}
      </p>
    </div>
  );
}
