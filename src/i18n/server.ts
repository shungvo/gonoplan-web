import 'server-only';

import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from './config';
import { getMessages } from './messages';
import { createTranslator, type TranslateFn } from './translate';

/**
 * The locale for this request: an explicit choice first, the browser's
 * preference second.
 *
 * Reading a cookie makes every route dynamic, and that is the price of this
 * approach rather than an oversight. It buys server-rendered HTML that is
 * already in the right language — the alternative, deciding on the client,
 * paints the whole app in English and then swaps it, which for a
 * Vietnamese-first audience is the wrong way round. Nothing here is
 * statically generated anyway: every screen's content is per-user or
 * per-location, and place detail already fetches in `generateMetadata`.
 */
export async function getLocale(): Promise<Locale> {
  /*
   * There is no request to read in a static export.
   *
   * The iOS bundle is prerendered at build time, where `cookies()` and
   * `headers()` throw rather than return nothing — the build fails with
   * "couldn't be rendered statically because it used cookies()". Falling back
   * to the default locale is not a downgrade there: the only thing this
   * decides is the `<title>` in prerendered HTML, and the app's own
   * `I18nProvider` picks the real locale on the client the moment it mounts.
   *
   * Deliberately caught rather than branched on an env flag. The web build
   * still reaches the lines below on every request, so the two builds share
   * one code path and the fallback is only taken when there is genuinely
   * nothing to read.
   */
  try {
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(chosen)) return chosen;

    const accept = (await headers()).get('accept-language');
    return negotiateLocale(accept);
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** `t` for Server Components, matching `useT()` on the client. */
export async function getT(): Promise<TranslateFn> {
  const locale = await getLocale();
  return createTranslator(locale, getMessages(locale));
}

export { DEFAULT_LOCALE };
