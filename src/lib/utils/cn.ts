import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, resolving Tailwind conflicts so the last value wins.
 *
 * Without this, `cn('p-4', props.className)` silently ignores a caller's
 * `p-2` — the two classes both apply and CSS order decides, which makes
 * component overrides unpredictable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
