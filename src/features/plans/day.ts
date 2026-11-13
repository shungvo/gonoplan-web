import type { Locale } from '@/i18n/config';

/**
 * Where a plan sits relative to now.
 *
 * The list used to be one flat run sorted by date, which put next Saturday, a
 * half-formed idea and a day from last month in the same column with the same
 * weight. They are three different things to somebody opening the tab: one is
 * what they came for, one is a draft, one is a memory.
 */
export type DayPhase = 'today' | 'upcoming' | 'past' | 'idea';

/**
 * Today's date in a given timezone, as `YYYY-MM-DD`.
 *
 * In the *plan's* timezone, not the device's: a Hanoi day looked at from
 * Berlin at 23:00 is already tomorrow in Hanoi, and that is the tomorrow the
 * plan means. `en-CA` is the one locale whose short date is ISO-shaped.
 */
export function todayIn(timezone: string, now: number): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(now));
  } catch {
    // An unknown zone name throws. Falling back to UTC is off by a few hours
    // at worst, which beats a plan list that will not render.
    return new Date(now).toISOString().slice(0, 10);
  }
}

/** Whole days from one `YYYY-MM-DD` to another. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  // Both parsed as UTC midnights, so a daylight-saving change in between
  // cannot make a day 23 hours long and round the answer down.
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function dayPhase(date: string | null, today: string): DayPhase {
  if (date === null) return 'idea';

  const days = daysBetween(today, date);
  if (days === 0) return 'today';
  return days > 0 ? 'upcoming' : 'past';
}

export interface GroupedPlans<T> {
  /** The one to lead with: today's, or failing that the nearest one ahead. */
  next: T | null;
  /** The rest of what is ahead, soonest first. */
  upcoming: T[];
  /** No date yet. */
  ideas: T[];
  /** Behind us, most recent first. */
  past: T[];
}

/**
 * Splits a list of plans into the four things the tab shows.
 *
 * The API sorts newest date first, which is the wrong way round for what is
 * ahead — the plan for tomorrow belongs above the one for next month — so the
 * upcoming half is re-sorted here and the past half keeps the API's order.
 */
export function groupPlans<T extends { date: string | null; timezone: string }>(
  plans: readonly T[],
  now: number,
): GroupedPlans<T> {
  const ahead: T[] = [];
  const ideas: T[] = [];
  const past: T[] = [];

  for (const plan of plans) {
    const phase = dayPhase(plan.date, todayIn(plan.timezone, now));
    if (phase === 'idea') ideas.push(plan);
    else if (phase === 'past') past.push(plan);
    else ahead.push(plan);
  }

  // `date` is never null in `ahead`; ISO dates sort correctly as strings.
  ahead.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  const [next = null, ...upcoming] = ahead;
  return { next, upcoming, ideas, past };
}

/** `540, 1080` → 540. Null when the day has no span, or one that is a single instant. */
export function spanMinutes(startsAtMin: number | null, endsAtMin: number | null): number | null {
  if (startsAtMin === null || endsAtMin === null) return null;

  const span = endsAtMin - startsAtMin;
  // An end before the start is a last stop that runs past midnight.
  const minutes = span < 0 ? span + 1440 : span;
  return minutes === 0 ? null : minutes;
}

/** The pieces of a date a calendar tile is made of, in the reader's language. */
export function dateTileParts(
  date: string,
  locale: Locale,
): { day: string; month: string; weekday: string } {
  const at = new Date(`${date}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(at);

  return {
    day: String(at.getUTCDate()),
    /*
     * `Intl` has no short Vietnamese month: `month: 'short'` answers
     * "tháng 11", which is the long form and does not fit a 56px tile. "T11"
     * is how the month is abbreviated on a Vietnamese calendar or a receipt,
     * so that is written here by hand rather than asked of the platform.
     */
    month: locale === 'vi' ? `T${String(at.getUTCMonth() + 1)}` : part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
  };
}
