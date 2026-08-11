import type { Locale } from '../config';
import type { Messages } from './keys';
import { en } from './en';
import { vi } from './vi';

/**
 * Both catalogues, always in the bundle.
 *
 * Two languages of UI strings is a few kilobytes gzipped, and lazily fetching
 * a catalogue would mean the language switch has a loading state — for a
 * saving smaller than one map tile. If a third and fourth language arrive,
 * this is the function to make async.
 */
const CATALOGUES: Record<Locale, Messages> = { en, vi };

export function getMessages(locale: Locale): Messages {
  return CATALOGUES[locale];
}
