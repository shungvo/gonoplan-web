import { describe, expect, it } from 'vitest';
import { swipeIntent } from './PlaceCardStack';

/**
 * The swipe decision, tested directly.
 *
 * The gesture itself belongs to `motion` and needs a real finger — synthetic
 * pointer events do not satisfy its recogniser, so driving the stack through a
 * headless browser proves nothing either way. This is the part that is ours,
 * and it is the part that decides whether a drag did anything at all.
 */
describe('swipeIntent', () => {
  it('advances on a drag past the threshold', () => {
    expect(swipeIntent(-80, 0)).toBe(1);
  });

  it('goes back on a drag the other way', () => {
    expect(swipeIntent(80, 0)).toBe(-1);
  });

  it('ignores a drag that never got going', () => {
    expect(swipeIntent(-20, 0)).toBe(0);
    expect(swipeIntent(20, 0)).toBe(0);
    expect(swipeIntent(0, 0)).toBe(0);
  });

  /** A flick is deliberate even though it barely moved. */
  it('accepts a short fast flick', () => {
    expect(swipeIntent(-18, -900)).toBe(1);
    expect(swipeIntent(18, 900)).toBe(-1);
  });

  it('does not accept a slow short drag as a flick', () => {
    expect(swipeIntent(-18, -100)).toBe(0);
  });

  /**
   * The case that motivated splitting distance from direction: a finger that
   * pulled left, changed its mind and was already travelling right on release.
   * Reading velocity alone would have called that "next".
   */
  it('ignores a gesture released while reversing', () => {
    expect(swipeIntent(-20, 900)).toBe(0);
    expect(swipeIntent(20, -900)).toBe(0);
  });

  it('lets distance win once it is past the threshold, whatever the velocity', () => {
    expect(swipeIntent(-120, 900)).toBe(1);
    expect(swipeIntent(120, -900)).toBe(-1);
  });

  it('treats the threshold as inclusive on both sides', () => {
    expect(swipeIntent(-56, 0)).toBe(1);
    expect(swipeIntent(56, 0)).toBe(-1);
    expect(swipeIntent(-55, 0)).toBe(0);
    expect(swipeIntent(55, 0)).toBe(0);
  });
});
