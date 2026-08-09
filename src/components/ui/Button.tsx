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
  // The coloured shadow is what makes the primary CTA read as a raised
  // physical object rather than a flat rectangle — the soft-3D direction
  // in §16, without reaching for glassmorphism.
  primary: 'bg-primary text-white shadow-primary hover:bg-primary/90 active:bg-primary/95',
  secondary: 'bg-surface text-ink border border-border shadow-sm hover:bg-surface-sunken',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES: Record<Size, string> = {
  // Never below 44px tall: Apple's minimum comfortable touch target, and the
  // difference between a button people hit and one they hit near.
  sm: 'h-11 px-4 text-sm rounded-sm gap-1.5',
  md: 'h-12 px-5 text-[0.9375rem] rounded-md gap-2',
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
