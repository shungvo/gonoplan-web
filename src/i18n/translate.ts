import type { Locale } from './config';
import type { MessageKey, Messages } from './messages/keys';

/**
 * Values a message can be given. Numbers are formatted for the locale, so
 * `{count}` in Vietnamese and English both read naturally at four figures.
 */
export type MessageParams = Record<string, string | number>;

export type TranslateFn = (key: MessageKey, params?: MessageParams) => string;

/**
 * Message lookup, interpolation and plural selection.
 *
 * Hand-rolled rather than reached for from a library, and it is small because
 * the platform does the hard part: `Intl.PluralRules` knows that Vietnamese
 * has one plural form and English has two, so nothing here encodes grammar.
 * What is left is a lookup, a `{placeholder}` substitution and a `#` for the
 * count — about forty lines against a dependency and a build step.
 */
export function createTranslator(locale: Locale, messages: Messages): TranslateFn {
  const plurals = new Intl.PluralRules(locale);
  const numbers = new Intl.NumberFormat(locale);

  return function translate(key: MessageKey, params?: MessageParams): string {
    const message = messages[key];

    // Unreachable through the type system, so this only fires if a catalogue
    // is loaded that does not match the keys it was compiled against. Showing
    // the key beats showing nothing: it is greppable and obviously wrong,
    // where an empty string is invisible in a screenshot.
    if (message === undefined) return key;

    let template: string;

    if (typeof message === 'string') {
      template = message;
    } else {
      const count = params?.['count'];
      const rule = typeof count === 'number' ? plurals.select(count) : 'other';
      // `other` is the one form every locale has, so it is the fallback for a
      // rule this catalogue happens not to spell out.
      template = message[rule] ?? message.other;
    }

    if (!params) return template;

    return template.replace(/\{(\w+)\}|#/g, (match, name: string | undefined) => {
      // `#` is shorthand for the count inside a plural form, which is where it
      // is wanted often enough that spelling out `{count}` every time is noise.
      const value = name === undefined ? params['count'] : params[name];

      if (value === undefined) return match;
      return typeof value === 'number' ? numbers.format(value) : value;
    });
  };
}
