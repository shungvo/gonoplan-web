import type { en } from './en';

/**
 * A message is either a plain string or a set of plural forms.
 *
 * `other` is mandatory because it is the one form every language has —
 * Vietnamese has only that one, and it is the fallback when a locale's rule
 * selects a form the catalogue does not spell out. The rest are optional, so a
 * Vietnamese entry is not forced to carry an English `one` it can never use.
 */
export type Message =
  | string
  | ({ other: string } & Partial<Record<Intl.LDMLPluralRule, string>>);

/**
 * Every key in the app, taken from the English catalogue.
 *
 * One of the two has to define the set, and it being a type means a missing
 * Vietnamese string is a compile error rather than an English word appearing
 * in the middle of a Vietnamese screen — which is the failure mode that makes
 * hand-maintained translations rot.
 */
export type MessageKey = keyof typeof en;

export type Messages = Record<MessageKey, Message>;
