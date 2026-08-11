'use client';

import { useT } from './I18nProvider';
import { en } from './messages/en';
import type { MessageKey } from './messages/keys';

/**
 * Reads a server enum — `SUSPENDED`, `REPORT_DISMISS` — as a phrase.
 *
 * The admin screens used to render these with
 * `value.toLowerCase().replace(/_/g, ' ')`, which is a translation strategy
 * that only works in one language. That transform survives as the fallback:
 * an enum case the catalogue has not caught up with should read awkwardly
 * rather than crash or vanish, and it keeps a moderator's screen working the
 * day the API adds one.
 */
export function useEnumLabel(): (group: 'status' | 'action', value: string) => string {
  const t = useT();

  return (group, value) => {
    const key = `enum.${group}.${value}`;
    if (key in en) return t(key as MessageKey);
    return value.toLowerCase().replace(/_/g, ' ');
  };
}
