import type { Locale } from '@/i18n/config';

/**
 * Times on a plan are minutes from midnight, the same way the API stores them.
 *
 * The alternative — a `Date` — would need a date to hang off, and the moment
 * one exists something converts it through a timezone. A plan for Hanoi built
 * in Berlin is still a Hanoi day, and an integer cannot be quietly shifted by
 * an hour.
 */

export const MINUTES_IN_DAY = 1440;

/** `"09:30"` → 570. Returns null for anything that is not a time of day. */
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** 570 → `"09:30"`, which is what an `<input type="time">` wants back. */
export function toTimeInput(minutes: number | null): string {
  if (minutes === null) return '';

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * The time as the reader writes it — 24-hour in Vietnamese, "9:30 AM" in
 * English, decided by `Intl` rather than by a format string of ours.
 *
 * Anchored to a fixed date because only the clock matters; the date exists so
 * there is something to format and is never shown.
 */
export function formatTimeOfDay(minutes: number, locale: Locale): string {
  const at = new Date(Date.UTC(2024, 0, 1, Math.floor(minutes / 60), minutes % 60));

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(at);
}

/**
 * Minutes between two stops, allowing for one that runs past midnight.
 *
 * Returns null when either side has no time — a stop with no clock attached is
 * an ordering, not a gap that can be measured.
 */
export function gapBetween(
  previousEnd: number | null,
  nextStart: number | null,
): number | null {
  if (previousEnd === null || nextStart === null) return null;

  const gap = nextStart - previousEnd;
  // A negative gap that is nearly a whole day is the previous stop having run
  // past midnight, not the next one starting yesterday.
  return gap < 0 ? gap + MINUTES_IN_DAY : gap;
}
