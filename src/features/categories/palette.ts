/**
 * The colours a category may be.
 *
 * Every one is OKLCH **L=0.52 C=0.13**, and only the hue changes — the same
 * rule the seeded set is built on, restated here because this is where new
 * categories now get their colour. Holding lightness and chroma fixed is what
 * makes a categorical palette read as a set: nothing is louder than anything
 * else, so a badge tells you what kind of place this is without competing with
 * the photograph behind it.
 *
 * The alternative — the free hex field this replaces — produced exactly the
 * failure the seeded palette was regenerated to fix. Picked by eye, lightness
 * ranged from 44 to 76 and chroma from 0.03 to 0.24, and the loudest colour on
 * a screen was decided by which category a place happened to be filed under.
 *
 * Fifteen hues, 24° apart: far enough to tell apart at badge size, close
 * enough that every hue family has a representative. The sixteenth is the
 * near-neutral at C=0.015, for the "uncategorised" kind of category — which
 * should not look like a category.
 *
 * White text on each of these is 4.86–5.93:1, clearing AA at every hue. That
 * matters because this colour is the fill behind `text-white` on every
 * category pill in the app; the API enforces the same 4.5:1 floor on whatever
 * is submitted, so a hand-typed colour cannot quietly fall below it.
 */
export const CATEGORY_PALETTE = [
  '#A64450',
  '#A5492A',
  '#9C5400',
  '#896200',
  '#6D6F00',
  '#467922',
  '#007F4C',
  '#008070',
  '#007C8E',
  '#0074A5',
  '#2E69B2',
  '#5A5EB2',
  '#7853A6',
  '#8F4A8F',
  '#9E4572',
  '#676872',
] as const;
