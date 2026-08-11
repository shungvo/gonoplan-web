'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * A description, edited in place.
 *
 * Used twice: once for the whole day and once per stop. Both are prose in the
 * owner's own words — "brunch, then the museum before it fills up" — and both
 * are optional, so the resting state has to be an invitation rather than an
 * empty box: a placeholder in muted text that becomes a field when tapped.
 *
 * Saved on blur, not per keystroke. This is a sentence, and a request per
 * character is a request per character; the trade is that a tab closed
 * mid-sentence loses it, which is the same bargain every notes field makes.
 *
 * Empty is stored as null rather than "": the API treats them differently —
 * an empty string is a description somebody wrote, `null` is one they never
 * did — and only one of those should survive clearing the box.
 */
export function PlanNote({
  value,
  label,
  placeholder,
  maxLength,
  onSave,
  className,
}: {
  value: string | null;
  /** Names the field for a screen reader; never shown. */
  label: string;
  placeholder: string;
  maxLength: number;
  onSave: (note: string | null) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const commit = () => {
    if (draft === null) return;

    const next = draft.trim();
    setDraft(null);
    // Nothing changed, so nothing is written — otherwise every tap on the
    // description is a PATCH and a new `updatedAt`, which reorders the list.
    if (next === (value ?? '')) return;
    onSave(next === '' ? null : next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? '');
        }}
        className={cn(
          'block w-full text-left text-sm leading-relaxed',
          value ? 'text-ink-muted' : 'text-ink-subtle italic',
          className,
        )}
      >
        {value ?? placeholder}
      </button>
    );
  }

  return (
    <textarea
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value.slice(0, maxLength));
      }}
      onBlur={commit}
      aria-label={label}
      placeholder={placeholder}
      autoFocus
      rows={3}
      className={cn(
        'bg-surface-sunken text-ink placeholder:text-ink-subtle block w-full resize-none rounded-md p-3',
        'text-sm leading-relaxed outline-none',
        className,
      )}
    />
  );
}
