'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/field';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { replyToReview, type OwnerReview } from '../api';

const MAX_LENGTH = 1000;

export function ReplySheet({
  review,
  onClose,
}: {
  review: OwnerReview | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={review !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Keyed per review so the textarea never opens carrying the previous
          reply's draft. */}
      {review && <ReplyForm key={review.id} review={review} onDone={onClose} />}
    </BottomSheet>
  );
}

function ReplyForm({ review, onDone }: { review: OwnerReview; onDone: () => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const submit = useMutation({
    // Rendered under the form, where the field that caused it is.
    meta: { inlineError: true },
    mutationFn: () => replyToReview(review.id, content.trim()),
    onSuccess: () => {
      // The inbox count and the public review list both change.
      void queryClient.invalidateQueries({ queryKey: ['owner'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onDone();
    },
  });

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (content.trim()) submit.mutate();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('reply.title')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {t('reply.context', {
          place: review.place.name,
          name: review.authorName,
          rating: review.rating,
        })}
      </Drawer.Description>

      {review.content && (
        <p className="bg-surface-sunken text-ink-muted mt-3 rounded-md p-3 text-sm leading-relaxed">
          {review.content}
        </p>
      )}

      <textarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value.slice(0, MAX_LENGTH));
        }}
        rows={5}
        aria-label={t('reply.label')}
        placeholder={t('reply.placeholder')}
        className={fieldClass('mt-3 resize-none p-3.5 text-md leading-relaxed')}
      />
      <p className="text-ink-subtle mt-1 text-right text-xs">
        {content.length}/{MAX_LENGTH}
      </p>

      {submit.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {describeError(submit.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-4"
        disabled={content.trim().length === 0}
        isLoading={submit.isPending}
      >
        {t('reply.post')}
      </Button>

      <p className="text-ink-subtle mt-3 pb-4 text-center text-xs">
        {t('reply.publicNotice')}
      </p>
    </form>
  );
}
