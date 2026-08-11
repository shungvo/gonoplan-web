'use client';

import { ChevronLeft } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';

export interface BackButtonProps {
  /** Where back goes is the screen's business, so every caller says it. */
  onClick: () => void;
  /** Overrides the default "Back" — the plan editor says "Plans". */
  label?: string | undefined;
  /**
   * Icon only, same surface and lift.
   *
   * For the one place a labelled pill does not fit: the search header, where
   * the button shares a row with the field and every pixel it takes is one the
   * query cannot use.
   */
  compact?: boolean;
  className?: string;
}

/**
 * The way back, everywhere.
 *
 * There were eight of these and no two agreed: seven bare 36–40px circles with
 * no background at all, and one raised pill on the place detail. The pill is
 * the one that reads as a control rather than as an icon someone left on the
 * page, so it won — and it is raised a step further here, onto `shadow-md`,
 * which carries the hairline ring the rest of the app's cards use to hold an
 * edge against a white page.
 *
 * A chevron rather than an arrow, following the same button: beside a word it
 * points, where an arrow reads as a second glyph competing with the label.
 */
export function BackButton({ onClick, label, compact = false, className }: BackButtonProps) {
  const t = useT();
  const text = label ?? t('page.back');

  return (
    <button
      type="button"
      onClick={onClick}
      // Kept even when the label is visible: it is the accessible name either
      // way, and screens that pass their own word ("Plans") still need this to
      // say what the control does.
      aria-label={text}
      className={cn(
        'text-ink bg-surface inline-flex h-10 shrink-0 items-center rounded-full text-sm font-medium shadow-md',
        'transition-transform active:scale-95',
        compact ? 'w-10 justify-center' : 'gap-1 pr-4 pl-2.5',
        className,
      )}
    >
      <ChevronLeft className="size-5 shrink-0" aria-hidden />
      {!compact && <span>{text}</span>}
    </button>
  );
}
