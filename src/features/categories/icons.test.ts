import { describe, expect, it } from 'vitest';
import { CATEGORY_ICON_KEYS, toCategoryIconKey } from './icons';
import { CATEGORY_PALETTE } from './palette';
import { __testing } from './CategoryGlyph';

describe('the icon vocabulary', () => {
  /**
   * The gap `satisfies` cannot close.
   *
   * `as const satisfies readonly CategoryIconKey[]` proves every key in the
   * picker is one the API accepts. It says nothing about the other direction:
   * add a shape to the contract and to the glyph table, forget this list, and
   * the shape exists everywhere except where somebody would choose it.
   */
  it('offers every shape that can be drawn', () => {
    expect([...CATEGORY_ICON_KEYS].sort()).toEqual([...__testing.glyphKeys].sort());
  });

  it('has no duplicates', () => {
    expect(new Set(CATEGORY_ICON_KEYS).size).toBe(CATEGORY_ICON_KEYS.length);
  });
});

describe('toCategoryIconKey', () => {
  it('passes a known key through', () => {
    expect(toCategoryIconKey('cup')).toBe('cup');
  });

  /**
   * The case this exists for: a category created before the enum, or a row
   * edited by hand, holds a key nothing can draw. It degrades to the neutral
   * shape rather than crashing the lookup — which is what the map does for the
   * same value.
   */
  it('falls back to the neutral shape for anything else', () => {
    expect(toCategoryIconKey('croissant')).toBe('dot');
    expect(toCategoryIconKey('')).toBe('dot');
    expect(toCategoryIconKey(undefined)).toBe('dot');
    expect(toCategoryIconKey(null)).toBe('dot');
    expect(toCategoryIconKey(7)).toBe('dot');
    expect(toCategoryIconKey({ iconKey: 'cup' })).toBe('dot');
  });
});

describe('the category palette', () => {
  /**
   * Every swatch is the fill behind `text-white` on a category pill, and the
   * API refuses anything below 4.5:1. A palette entry that the API would
   * reject is a button that fails when pressed.
   */
  it('offers only colours white text can sit on', () => {
    const channel = (value: number) => {
      const srgb = value / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };

    for (const hex of CATEGORY_PALETTE) {
      const num = Number.parseInt(hex.slice(1), 16);
      const luminance =
        0.2126 * channel((num >> 16) & 0xff) +
        0.7152 * channel((num >> 8) & 0xff) +
        0.0722 * channel(num & 0xff);

      expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('is written in the form the API accepts', () => {
    for (const hex of CATEGORY_PALETTE) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });
});
