'use client';

import { Star } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';

const LABEL_KEYS: MessageKey[] = ['stars.1', 'stars.2', 'stars.3', 'stars.4', 'stars.5'];

/**
 * Five tappable stars with a word attached.
 *
 * A radiogroup rather than five buttons, so screen readers announce it as one
 * choice of five and arrow keys move between them. The word matters: "4" means
 * different things to different people, and "Great" anchors it.
 */
export function StarInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const t = useT();

  /** The word for a rating — "Great" — which is what anchors the number. */
  const word = (rating: number): string => t(LABEL_KEYS[rating - 1] ?? 'stars.3');

  return (
    <div>
      <div role="radiogroup" aria-label={t('stars.groupLabel')} className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={t('stars.starLabel', { count: star, word: word(star) })}
            disabled={disabled}
            onClick={() => {
              onChange(star);
            }}
            className={cn(
              'flex size-11 items-center justify-center rounded-full',
              'press-firm disabled:opacity-50',
            )}
          >
            <Star
              className={cn(
                'size-8 transition-colors',
                star <= value ? 'fill-warning text-warning' : 'text-border',
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Reserved height, so choosing a rating does not shift the form. */}
      <p className="text-ink-muted mt-1 h-5 text-center text-sm font-medium">
        {value > 0 ? word(value) : t('stars.prompt')}
      </p>
    </div>
  );
}
