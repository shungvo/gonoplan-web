'use client';

import { Star } from 'lucide-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber, formatRating } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';

export interface RatingProps {
  value: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A single star and a number, not five stars.
 *
 * Five stars costs five times the horizontal space to communicate the same
 * thing as "4.6", and half-star fills are unreadable at card scale. The number
 * is also what people actually compare.
 */
export function Rating({ value, reviewCount, size = 'sm', className }: RatingProps) {
  const t = useT();
  const locale = useLocale();
  const hasReviews = reviewCount === undefined || reviewCount > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <Star
        className={cn(
          size === 'sm' ? 'size-3.5' : 'size-4',
          hasReviews ? 'fill-warning text-warning' : 'text-ink-subtle',
        )}
        aria-hidden
      />
      {hasReviews ? (
        <>
          <span className="font-semibold text-ink">{formatRating(value, locale)}</span>
          {reviewCount !== undefined && (
            <span className="text-ink-subtle">({formatNumber(reviewCount, locale)})</span>
          )}
        </>
      ) : (
        // "New" is honest and inviting; "0.0" reads as bad rather than unrated.
        <span className="font-medium text-ink-subtle">{t('place.new')}</span>
      )}
    </span>
  );
}

const PRICE_LABEL: Record<string, string> = {
  BUDGET: '$',
  MODERATE: '$$',
  EXPENSIVE: '$$$',
  LUXURY: '$$$$',
};

export function PriceRange({ value, className }: { value: string | null; className?: string }) {
  if (!value) return null;

  return (
    <span className={cn('text-xs font-semibold tracking-wide text-primary', className)}>
      {PRICE_LABEL[value] ?? ''}
    </span>
  );
}
