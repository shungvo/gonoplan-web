import type { ClassValue } from 'clsx';
import { cn } from '@/lib/utils/cn';

/**
 * The shared look for every text input and textarea.
 *
 * Bordered, not just filled. A sunken pill with no border, no value and no
 * placeholder is indistinguishable from a disabled control or a loading
 * skeleton — which is exactly how the business-registration form read: three
 * grey slabs and a greyed-out button.
 *
 * This exists because the same class string was copy-pasted nine times across
 * five files. That is the reason the affordance could be missing everywhere at
 * once and be nobody's obvious bug: there was no single place that described
 * what a field looks like.
 */
export function fieldClass(...extra: ClassValue[]): string {
  return cn(
    'w-full rounded-md border border-border bg-surface-sunken text-ink',
    'placeholder:text-ink-subtle',
    // The border carries the focus state as well as the ring: on a tinted
    // background a 2px outline alone reads as a halo rather than as "this is
    // where you are typing".
    'outline-none transition-colors',
    'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary',
    extra,
  );
}
