'use client';

import { fieldClass } from '@/components/ui/field';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import { CATEGORY_ICON_KEYS } from '@/features/categories/icons';
import { CATEGORY_PALETTE } from '@/features/categories/palette';
import { categorySolid } from '@/features/categories/color';
import type { CategoryIconKey } from '@/features/categories/api';

export interface CategoryStyleValue {
  iconKey: CategoryIconKey;
  colorHex: string;
}

/**
 * The two choices that decide what a category looks like everywhere.
 *
 * Both were text fields: `iconKey` free-typed and validated as "a string up to
 * forty characters", the colour a raw hex. Both failed silently and off-screen
 * — an invented key drew a grey dot on every pin of that category, and a light
 * colour made the white label on its pill unreadable. The live database has one
 * of each: `dating`, added with `iconKey: 'heart'` (no such shape) at
 * `#FF94A8` (white text at 2.09:1).
 *
 * So: shapes you can see, colours from the app's own ring, and the resulting
 * pill rendered beside them. Nothing here can be chosen blind.
 *
 * Shared by the create form and the row editor rather than duplicated, because
 * an existing category with the wrong icon has no other way to be fixed.
 */
export function CategoryStyle({
  value,
  onChange,
  label,
}: {
  value: CategoryStyleValue;
  onChange: (next: CategoryStyleValue) => void;
  /** What the preview pill says. The name is not this component's business. */
  label: string;
}) {
  const t = useT();

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-ink-muted text-xs font-medium">{t('taxonomy.icon')}</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORY_ICON_KEYS.map((key) => {
            const isChosen = key === value.iconKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange({ ...value, iconKey: key });
                }}
                aria-pressed={isChosen}
                // The key itself is the label: this is an admin screen, and it
                // is the value that gets stored, so the grid and the seed file
                // read the same.
                aria-label={key}
                title={key}
                className={cn(
                  'press-surface flex size-10 items-center justify-center rounded-md border',
                  isChosen
                    ? 'border-transparent text-white'
                    : 'border-border bg-surface text-ink-muted hover:text-ink',
                )}
                style={isChosen ? { backgroundColor: categorySolid(value.colorHex) } : {}}
              >
                <CategoryGlyph iconKey={key} className="size-5" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-ink-muted text-xs font-medium">{t('taxonomy.colour')}</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORY_PALETTE.map((hex) => {
            const isChosen = hex.toLowerCase() === value.colorHex.toLowerCase();

            return (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  onChange({ ...value, colorHex: hex });
                }}
                aria-pressed={isChosen}
                aria-label={hex}
                title={hex}
                className={cn(
                  'press-surface size-8 rounded-full',
                  // The ring sits outside the swatch, so selecting one does not
                  // shrink the colour you are judging.
                  isChosen && 'ring-ink ring-offset-surface ring-2 ring-offset-2',
                )}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* The escape hatch, deliberately quiet. The ring is the answer; this
              is for the admin with a reason. Anything too light for white label
              text comes back refused, with that as the message, rather than
              shipping a pill nobody can read. */}
          <label className="flex items-center gap-2">
            <span className="text-ink-subtle text-xs">{t('taxonomy.customColour')}</span>
            <input
              value={value.colorHex}
              onChange={(event) => {
                onChange({ ...value, colorHex: event.target.value });
              }}
              spellCheck={false}
              className={fieldClass('h-8 w-28 px-2 font-mono text-xs')}
            />
          </label>

          {/*
            What the two choices actually produce.

            Neither is ever seen on this screen — they are a pill on a card and
            a pin on a map, both somewhere else. So the pill is rendered here,
            in the markup the app uses, updating as you choose.
          */}
          <span className="flex items-center gap-2">
            <span className="text-ink-subtle text-xs">{t('taxonomy.preview')}</span>
            <span
              className="text-2xs inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-white"
              style={{ backgroundColor: categorySolid(value.colorHex) }}
            >
              <CategoryGlyph iconKey={value.iconKey} className="size-3.5" strokeWidth={2.25} />
              {label}
            </span>
          </span>
        </div>
      </fieldset>
    </div>
  );
}
