import type { CategoryIconKey } from './api';

/**
 * The icon vocabulary in the order the admin picker offers it.
 *
 * Separate from `CategoryGlyph.tsx` because the shapes are JSX and this is
 * data: the cache walker needs the narrowing function and has no business
 * pulling every lucide icon into its bundle to get it.
 *
 * `satisfies` checks that each key is one the contract accepts. It cannot
 * check that none is *missing* — `icons.test.ts` does that, against the glyph
 * table itself.
 *
 * The order is not alphabetical on purpose: it groups food, drink, stay and
 * do, so the picker reads as a menu rather than a bag of shapes.
 */
export const CATEGORY_ICON_KEYS = [
  'cup',
  'bean',
  'bowl',
  'pho',
  'fish',
  'cart',
  'glass',
  'moon',
  'bed',
  'house',
  'skyline',
  'sparkle',
  'leaf',
  'column',
  'ticket',
  'film',
  'bag',
  'dot',
] as const satisfies readonly CategoryIconKey[];

/**
 * Narrows an unvalidated value to the vocabulary.
 *
 * For the one place that reads a category out of something the contract does
 * not type: the cache walker, which inspects whatever shape a response
 * happened to have, including payloads cached before `iconKey` existed.
 * Everywhere else the DTO's own union is enough and this is not needed —
 * reach for it only where the value genuinely is `unknown`.
 *
 * `dot` is the fallback because it is what the map already draws for a key it
 * does not recognise, so the two surfaces degrade the same way.
 */
export function toCategoryIconKey(value: unknown): CategoryIconKey {
  if (typeof value !== 'string') return 'dot';
  return CATEGORY_ICON_KEYS.find((key) => key === value) ?? 'dot';
}
