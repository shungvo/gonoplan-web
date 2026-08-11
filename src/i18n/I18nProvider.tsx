'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, type Locale } from './config';
import { getMessages } from './messages';
import { createTranslator, type TranslateFn } from './translate';

interface I18nValue {
  locale: Locale;
  t: TranslateFn;
}

/**
 * Defaulted rather than nullable, so a component rendered outside the provider
 * — a test, a Storybook-style harness — shows Vietnamese instead of throwing.
 * A missing provider should look wrong, not crash a screen.
 */
const I18nContext = createContext<I18nValue | null>(null);

/**
 * Carries the request's locale into every Client Component.
 *
 * Only the locale crosses the boundary, not the catalogue: both are already in
 * the client bundle, so serialising several hundred strings into the RSC
 * payload on every navigation would be paying twice for the same text.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(locale, getMessages(locale)) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value) return value;

  return {
    locale: DEFAULT_LOCALE,
    t: createTranslator(DEFAULT_LOCALE, getMessages(DEFAULT_LOCALE)),
  };
}

/** The translator. `const t = useT()` then `t('home.title')`. */
export function useT(): TranslateFn {
  return useI18n().t;
}

/** For `Intl` formatting that is not a message — dates, numbers, currency. */
export function useLocale(): Locale {
  return useI18n().locale;
}
