import { describe, expect, it } from 'vitest';
import { dateTileParts, dayPhase, daysBetween, groupPlans, spanMinutes, todayIn } from './day';

/** 2026-08-12 10:00 in Ho Chi Minh City. */
const NOW = Date.UTC(2026, 7, 12, 3, 0);
const HCMC = 'Asia/Ho_Chi_Minh';

const plan = (id: string, date: string | null, timezone = HCMC) => ({ id, date, timezone });

describe('todayIn', () => {
  it('is the date where the plan is, not where the clock is', () => {
    // 20:00 UTC on the 12th is already 03:00 on the 13th in Vietnam.
    const lateEvening = Date.UTC(2026, 7, 12, 20, 0);

    expect(todayIn(HCMC, lateEvening)).toBe('2026-08-13');
    expect(todayIn('UTC', lateEvening)).toBe('2026-08-12');
  });

  it('survives a timezone name it does not know', () => {
    expect(todayIn('Not/AZone', NOW)).toBe('2026-08-12');
  });
});

describe('daysBetween', () => {
  it('counts whole days in either direction', () => {
    expect(daysBetween('2026-08-12', '2026-08-15')).toBe(3);
    expect(daysBetween('2026-08-12', '2026-08-10')).toBe(-2);
    expect(daysBetween('2026-08-12', '2026-08-12')).toBe(0);
  });

  it('is not thrown by a month or a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('dayPhase', () => {
  it('sorts a date into today, ahead, behind — or no date at all', () => {
    expect(dayPhase('2026-08-12', '2026-08-12')).toBe('today');
    expect(dayPhase('2026-08-13', '2026-08-12')).toBe('upcoming');
    expect(dayPhase('2026-08-11', '2026-08-12')).toBe('past');
    expect(dayPhase(null, '2026-08-12')).toBe('idea');
  });
});

describe('groupPlans', () => {
  // Newest first, the way the API sends them.
  const plans = [
    plan('next-month', '2026-09-20'),
    plan('saturday', '2026-08-15'),
    plan('today', '2026-08-12'),
    plan('yesterday', '2026-08-11'),
    plan('last-month', '2026-07-01'),
    plan('someday', null),
  ];

  it('leads with today, then the rest ahead soonest first', () => {
    const grouped = groupPlans(plans, NOW);

    expect(grouped.next?.id).toBe('today');
    expect(grouped.upcoming.map((p) => p.id)).toEqual(['saturday', 'next-month']);
  });

  it('keeps what is behind most recent first, and drafts on their own', () => {
    const grouped = groupPlans(plans, NOW);

    expect(grouped.past.map((p) => p.id)).toEqual(['yesterday', 'last-month']);
    expect(grouped.ideas.map((p) => p.id)).toEqual(['someday']);
  });

  it('leads with the nearest day ahead when nothing is today', () => {
    const grouped = groupPlans(plans.filter((p) => p.id !== 'today'), NOW);

    expect(grouped.next?.id).toBe('saturday');
  });

  it('has nothing to lead with when every plan is behind or undated', () => {
    const grouped = groupPlans([plan('old', '2026-01-01'), plan('idea', null)], NOW);

    expect(grouped.next).toBeNull();
    expect(grouped.upcoming).toEqual([]);
  });
});

describe('spanMinutes', () => {
  it('measures the day, including one that ends after midnight', () => {
    expect(spanMinutes(540, 1080)).toBe(540);
    expect(spanMinutes(1320, 60)).toBe(180);
  });

  it('has nothing to say without both ends, or for a single instant', () => {
    expect(spanMinutes(540, null)).toBeNull();
    expect(spanMinutes(null, null)).toBeNull();
    expect(spanMinutes(540, 540)).toBeNull();
  });
});

describe('dateTileParts', () => {
  it('reads the date as written, whatever zone the device is in', () => {
    expect(dateTileParts('2026-08-12', 'en').day).toBe('12');
    expect(dateTileParts('2026-08-12', 'en').month).toBe('Aug');
    expect(dateTileParts('2026-08-12', 'en').weekday).toBe('Wed');
  });

  it('abbreviates a Vietnamese month the way a calendar does', () => {
    // `Intl` only has the long form, which does not fit the tile.
    expect(dateTileParts('2026-11-01', 'vi').month).toBe('T11');
  });
});
