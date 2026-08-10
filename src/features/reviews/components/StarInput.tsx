'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

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
  return (
    <div>
      <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${String(star)} ${star === 1 ? 'star' : 'stars'} — ${LABELS[star] ?? ''}`}
            disabled={disabled}
            onClick={() => {
              onChange(star);
            }}
            className={cn(
              'flex size-11 items-center justify-center rounded-full',
              'transition-transform duration-150 active:scale-90 disabled:opacity-50',
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
      <p className="mt-1 h-5 text-center text-sm font-medium text-ink-muted">
        {value > 0 ? LABELS[value] : 'Tap to rate'}
      </p>
    </div>
  );
}
