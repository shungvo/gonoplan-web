/**
 * The translator.
 *
 * Key completeness is a type error, not a test — `Messages` is derived from the
 * English catalogue, so a missing Vietnamese string fails `tsc`. What types
 * cannot check is what the platform does with a count, and that is the part
 * this file exercises: Vietnamese has one plural form and English has two, and
 * nothing in `translate.ts` encodes either of those facts.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from './translate';
import { negotiateLocale } from './config';
import { en } from './messages/en';
import { vi } from './messages/vi';
import type { Messages } from './messages/keys';

const t = (locale: 'en' | 'vi', messages: Messages) => createTranslator(locale, messages);

describe('plural selection', () => {
  it('uses the singular form in English for one', () => {
    expect(t('en', en)('search.placeCount', { count: 1 })).toBe('1 place');
  });

  it('uses the plural form in English for anything else', () => {
    expect(t('en', en)('search.placeCount', { count: 0 })).toBe('0 places');
    expect(t('en', en)('search.placeCount', { count: 2 })).toBe('2 places');
  });

  /**
   * Vietnamese has one form. The entry is a plain string, and the count is
   * written straight into the sentence — never "3 địa điểms".
   */
  it('uses one form in Vietnamese regardless of count', () => {
    const translate = t('vi', vi);
    expect(translate('search.placeCount', { count: 1 })).toBe('1 địa điểm');
    expect(translate('search.placeCount', { count: 7 })).toBe('7 địa điểm');
  });
});

describe('interpolation', () => {
  it('fills a named placeholder', () => {
    expect(t('en', en)('home.showingAround', { label: 'Da Nang' })).toBe(
      'Showing places around Da Nang',
    );
  });

  it('formats numbers for the locale', () => {
    // English groups with commas, Vietnamese with full stops. This is the
    // reason params are formatted rather than interpolated as raw strings.
    expect(t('en', en)('overview.totalPlaces', { count: 12345 })).toBe('12,345 total');
    expect(t('vi', vi)('overview.totalPlaces', { count: 12345 })).toBe('tổng 12.345');
  });

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    expect(t('en', en)('home.showingAround', {})).toBe('Showing places around {label}');
  });
});

describe('locale negotiation', () => {
  it('reads the first supported tag in order', () => {
    expect(negotiateLocale('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
    expect(negotiateLocale('en-GB,en;q=0.9')).toBe('en');
  });

  it('ignores the region subtag', () => {
    expect(negotiateLocale('en-US')).toBe('en');
  });

  it('falls back to Vietnamese for a header it cannot use', () => {
    expect(negotiateLocale('fr-FR,de;q=0.8')).toBe('vi');
    expect(negotiateLocale(null)).toBe('vi');
    expect(negotiateLocale('')).toBe('vi');
  });
});
