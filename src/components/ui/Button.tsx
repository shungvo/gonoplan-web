'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  /*
   * A filled button is a raised object; an outlined one rests on the page; a
   * ghost is painted on it. Each variant's shadow is that sentence.
   *
   * `danger` used to have no shadow at all — the same shape and the same
   * emphasis as `primary`, sitting flat while primary floated. Two buttons
   * side by side in a dialog, made of different material. It now gets the
   * same treatment in its own colour.
   *
   * Pressing drops a filled button to `shadow-pressed`: the gap under it
   * closes as it goes down. Scale alone moved the shape and left the shadow
   * where it was, which reads as shrinking rather than being pushed.
   */
  primary:
    'bg-primary text-white shadow-primary hover:bg-primary/90 active:bg-primary/95 active:shadow-pressed',
  secondary:
    'bg-surface text-ink border border-border shadow-sm hover:bg-surface-sunken active:shadow-pressed',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken',
  danger: 'bg-danger text-white shadow-danger hover:bg-danger/90 active:shadow-pressed',
};

const SIZES: Record<Size, string> = {
  // Never below 44px tall: Apple's minimum comfortable touch target, and the
  // difference between a button people hit and one they hit near.
  sm: 'h-11 px-4 text-sm rounded-sm gap-1.5',
  md: 'h-12 px-5 text-md rounded-md gap-2',
  lg: 'h-14 px-6 text-base rounded-lg gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leadingIcon,
    className,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled === true || isLoading}
      // Communicates the pending state to screen readers, which cannot see
      // the spinner.
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-[transform,background-color,box-shadow] duration-150 ease-[var(--ease-out-soft)]',
        // A small scale on press is the cheapest possible tactile feedback,
        // and the only one iOS Safari can give us — it has no haptics API.
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  );
});
