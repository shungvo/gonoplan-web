/**
 * Locale configuration.
 *
 * The locale lives in a cookie and in `User.locale`, never in the URL. That
 * was a deliberate choice: keeping it out of the path means no route file
 * moves under a `[locale]` segment and no internal link has to be rewritten,
 * and a shared link opens in the reader's own language rather than the
 * sender's.
 *
 * The cost is real and worth stating: search engines see one language per URL,
 * so there is no `hreflang` pair to rank for both Vietnamese and English
 * queries. If that becomes the priority, the swap is a `[locale]` segment plus
 * a locale-aware `Link` — everything below this file stays as it is.
 */

export const LOCALES = ['vi', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Vietnamese, matching `User.locale`'s database default. */
export const DEFAULT_LOCALE: Locale = 'vi';

export const LOCALE_COOKIE = 'gonoplan_locale';

/** A year: the choice should outlive the trip somebody made it on. */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}

/**
 * Picks a locale from an `Accept-Language` header.
 *
 * Deliberately simple: the header is a q-weighted list, and this reads it in
 * order rather than sorting by quality, because the browsers that send
 * anything other than descending order are not ones this app targets. Region
 * subtags are dropped — `en-GB`, `en-US` and `en` are one locale here.
 *
 * Returns the default when nothing matches, which is the common case for a
 * Vietnamese phone whose header says `vi` anyway.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase();
    if (!tag) continue;

    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
