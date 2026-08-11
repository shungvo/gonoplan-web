import type { Locale } from './config';

/**
 * Locale-aware formatting for the things that are not messages.
 *
 * `Intl` constructors are not free, so each is memoised per locale — these run
 * inside lists that render on every keystroke of a search.
 */
function memoise<T>(build: (locale: Locale) => T): (locale: Locale) => T {
  const cache = new Map<Locale, T>();

  return (locale) => {
    const hit = cache.get(locale);
    if (hit) return hit;

    const made = build(locale);
    cache.set(locale, made);
    return made;
  };
}

const numberFormat = memoise((locale) => new Intl.NumberFormat(locale));

const dateFormat = memoise(
  (locale) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
);

const relativeFormat = memoise(
  (locale) => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
);

const weekdayFormat = memoise((locale) => new Intl.DateTimeFormat(locale, { weekday: 'short' }));

/**
 * One decimal place, with the locale's decimal mark.
 *
 * `toFixed(1)` always writes a full stop, so a Vietnamese rating read "4.6"
 * where every other number on the screen used a comma.
 */
const ratingFormat = memoise(
  (locale) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
);

export function formatRating(value: number, locale: Locale): string {
  return ratingFormat(locale).format(value);
}

/** One decimal place, for distances. Same formatter, different caller. */
export function formatDecimal(value: number, locale: Locale): string {
  return ratingFormat(locale).format(value);
}

/**
 * A weekday name from its index, 0 = Sunday.
 *
 * Built from a reference week rather than a hardcoded list, so the names come
 * from the platform and are correct in any locale added later. 7 January 2024
 * was a Sunday; the UTC timezone keeps the arithmetic from sliding a day.
 */
const longWeekdayFormat = memoise(
  (locale) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }),
);

export function formatWeekdayName(index: number, locale: Locale): string {
  return longWeekdayFormat(locale).format(new Date(Date.UTC(2024, 0, 7 + index)));
}

export function formatNumber(value: number, locale: Locale): string {
  return numberFormat(locale).format(value);
}

export function formatDate(iso: string, locale: Locale): string {
  return dateFormat(locale).format(new Date(iso));
}

export function formatWeekday(date: Date, locale: Locale): string {
  return weekdayFormat(locale).format(date);
}

/**
 * "3 ngày trước" / "3 days ago".
 *
 * `Intl.RelativeTimeFormat` needs the unit chosen for it, so the ladder below
 * is unavoidable — but the wording, the pluralisation and "yesterday" instead
 * of "1 day ago" all come from the platform.
 */
export function formatRelativeTime(from: Date, now: number, locale: Locale): string {
  const seconds = Math.round((now - from.getTime()) / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ];

  let value = seconds;
  let unit: Intl.RelativeTimeFormatUnit = 'second';

  for (const [name, size] of units) {
    unit = name;
    if (Math.abs(value) < size) break;
    value = Math.round(value / size);
  }

  return relativeFormat(locale).format(-value, unit);
}

/**
 * "12 min" / "12 phút", from the platform rather than a suffix we append.
 *
 * `Intl.NumberFormat`'s unit style knows the abbreviation and the spacing for
 * each locale, which is the part that gets quietly wrong when a duration is
 * built by concatenating a number and a hardcoded "min".
 */
const unitFormats = new Map<string, Intl.NumberFormat>();

export function formatUnit(value: number, unit: 'minute' | 'hour', locale: Locale): string {
  const key = `${locale}:${unit}`;
  let formatter = unitFormats.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' });
    unitFormats.set(key, formatter);
  }

  return formatter.format(value);
}
