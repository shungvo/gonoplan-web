import { describe, expect, it } from 'vitest';
import { snapToGrid, haversineMeters, formatDistance } from './grid';

// District 1, Ho Chi Minh City.
const BASE = { latitude: 10.7725, longitude: 106.698 };

describe('snapToGrid', () => {
  it('collapses GPS jitter onto the same cache key', () => {
    // Jitter is measured around a cell centre, because that is the property
    // being claimed: a stationary phone drifting ±15 m keeps the same key.
    const centre = snapToGrid(BASE);
    const drifted = {
      latitude: centre.latitude + 0.00013,
      longitude: centre.longitude - 0.00011,
    };

    expect(snapToGrid(drifted)).toEqual(centre);
  });

  it('does not claim to collapse points that straddle a cell boundary', () => {
    // Inherent to any fixed grid: two points metres apart on opposite sides of
    // a boundary land in different cells. For a cache key that costs one extra
    // fetch, never a wrong result — so it is a documented limit, not a bug.
    const step = 0.0018288; // ~200 m of longitude at this latitude
    const centre = snapToGrid(BASE);
    const justPastBoundary = {
      latitude: centre.latitude,
      longitude: centre.longitude + step / 2 + 1e-6,
    };

    expect(snapToGrid(justPastBoundary)).not.toEqual(centre);
  });

  it('keeps genuinely different locations apart', () => {
    // ~1 km north — a real move, and a different set of nearby places.
    const moved = { latitude: BASE.latitude + 0.009, longitude: BASE.longitude };

    expect(snapToGrid(moved)).not.toEqual(snapToGrid(BASE));
  });

  it('never moves a point further than the grid size', () => {
    const snapped = snapToGrid(BASE, 200);

    // Snapping rounds to the nearest cell, so the worst case is half a cell
    // on each axis — under 200 m in total.
    expect(haversineMeters(BASE, snapped)).toBeLessThan(200);
  });

  it('is idempotent', () => {
    const once = snapToGrid(BASE);
    expect(snapToGrid(once)).toEqual(once);
  });

  it('stays finite near the poles, where a degree of longitude collapses', () => {
    const result = snapToGrid({ latitude: 89.999, longitude: 100 });

    expect(Number.isFinite(result.latitude)).toBe(true);
    expect(Number.isFinite(result.longitude)).toBe(true);
  });
});

describe('haversineMeters', () => {
  it('measures a known short distance', () => {
    // Ben Thanh Market → The Cafe Apartment, ~690 m.
    const distance = haversineMeters(BASE, { latitude: 10.7745, longitude: 106.704 });

    expect(distance).toBeGreaterThan(600);
    expect(distance).toBeLessThan(780);
  });

  it('is zero for the same point', () => {
    expect(haversineMeters(BASE, BASE)).toBe(0);
  });
});

describe('formatDistance', () => {
  it('rounds metres to the nearest ten, because GPS is not precise', () => {
    expect(formatDistance(447, 'en')).toBe('450 m');
  });

  it('switches to kilometres with one decimal', () => {
    expect(formatDistance(1240, 'en')).toBe('1.2 km');
  });

  it('drops the decimal once it stops being meaningful', () => {
    expect(formatDistance(14_600, 'en')).toBe('15 km');
  });
});
