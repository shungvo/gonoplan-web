'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** Tints the chip with a category colour when selected. */
  colorHex?: string;
  className?: string;
}

/** Filter chip (§41). Always a real button, so it is reachable by keyboard. */
export function Chip({ children, selected = false, onClick, colorHex, className }: ChipProps) {
  const tint = selected && colorHex ? { backgroundColor: `${colorHex}1a`, color: colorHex } : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={tint}
      className={cn(
        // 44px, not 36. Button already documents this floor as Apple's minimum
        // comfortable target, and chips are the primary filter control on two
        // screens — they were the one place breaking the rule.
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4',
        'text-sm font-medium whitespace-nowrap',
        'transition-[background-color,transform] duration-150 active:scale-[0.97]',
        selected && !colorHex && 'bg-primary text-white shadow-primary',
        // Outlined rather than shadowed when unselected. A row of shadowed
        // pills over a tinted background reads as a row of raised buttons
        // competing with the CTA; a hairline border keeps them as filters.
        !selected && 'border border-border bg-surface text-ink-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}
