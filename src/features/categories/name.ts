import type { Locale } from '@/i18n/config';

/**
 * A category's name in the reader's language.
 *
 * Category names are data, not UI strings — they live in the `categories`
 * table with both spellings, and an administrator can add a fifteenth one
 * without touching a catalogue. So this reads the row rather than a message
 * key, and falls back to the English name when the Vietnamese one is somehow
 * empty: a category with no label is a chip nobody can tap.
 */
export function categoryName(
  category: { name: string; nameVi?: string | undefined },
  locale: Locale,
): string {
  if (locale !== 'vi') return category.name;
  return category.nameVi?.trim() ? category.nameVi : category.name;
}
