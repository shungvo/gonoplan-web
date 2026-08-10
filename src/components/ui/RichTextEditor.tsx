'use client';

import { useRef, useState } from 'react';
import {
  Bold,
  Heading,
  Italic,
  List,
  ListOrdered,
  Link2,
  Eye,
  Pencil,
} from 'lucide-react';
import { RichText } from './RichText';
import { fieldClass } from './field';
import { cn } from '@/lib/utils/cn';

/**
 * A formatting toolbar over a plain textarea, not a `contenteditable`.
 *
 * WYSIWYG here would mean the description is HTML, and HTML from a client
 * shown on a page that carries a session is a stored-XSS problem you then
 * spend forever sanitising. Markdown in a textarea keeps the stored value
 * plain text — safe by construction, diffable in the moderation queue, and
 * still readable if every renderer in the app disappears.
 *
 * The toolbar exists because most people do not know Markdown and should not
 * have to. The preview tab exists because the toolbar is a promise the writer
 * has no other way to check.
 */

type Wrap = { before: string; after: string };
type LinePrefix = { prefix: string };
type Action = Wrap | LinePrefix;

const TOOLS: Array<{ label: string; icon: typeof Bold; action: Action }> = [
  { label: 'Bold', icon: Bold, action: { before: '**', after: '**' } },
  { label: 'Italic', icon: Italic, action: { before: '*', after: '*' } },
  { label: 'Heading', icon: Heading, action: { prefix: '## ' } },
  { label: 'Bullet list', icon: List, action: { prefix: '- ' } },
  { label: 'Numbered list', icon: ListOrdered, action: { prefix: '1. ' } },
  { label: 'Link', icon: Link2, action: { before: '[', after: '](https://)' } },
];

export function RichTextEditor({
  value,
  onChange,
  maxLength,
  placeholder,
  disabled = false,
  rows = 8,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  id?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /**
   * Applies a tool to the selection.
   *
   * Selection-aware on purpose: a bold button that appends `****` to the end
   * of the text regardless of the cursor is a button people press once.
   */
  const apply = (action: Action) => {
    const node = textareaRef.current;
    if (!node) return;

    const start = node.selectionStart;
    const end = node.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let cursor: number;

    if ('prefix' in action) {
      // Line tools act on whole lines, so pressing "bullet" mid-word marks the
      // line rather than splicing a dash into the middle of a sentence.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      next = `${value.slice(0, lineStart)}${action.prefix}${value.slice(lineStart)}`;
      cursor = start + action.prefix.length;
    } else {
      next = `${value.slice(0, start)}${action.before}${selected}${action.after}${value.slice(end)}`;
      // With a selection, land after it; with none, land between the markers
      // so typing continues inside the formatting.
      cursor = selected
        ? start + action.before.length + selected.length + action.after.length
        : start + action.before.length;
    }

    if (next.length > maxLength) return;

    onChange(next);
    // After React has written the new value, or the caret jumps to the end.
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {TOOLS.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            disabled={disabled || preview}
            onClick={() => {
              apply(action);
            }}
            aria-label={label}
            title={label}
            className="text-ink-muted hover:bg-surface-sunken flex size-9 items-center justify-center rounded-sm disabled:opacity-40"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setPreview((open) => !open);
          }}
          aria-pressed={preview}
          className={cn(
            'ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium',
            preview ? 'bg-primary-tint text-primary' : 'text-ink-muted',
          )}
        >
          {preview ? (
            <Pencil className="size-3.5" aria-hidden />
          ) : (
            <Eye className="size-3.5" aria-hidden />
          )}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="border-border bg-surface-sunken min-h-40 rounded-md border p-3.5">
          {value.trim() ? (
            <RichText source={value} />
          ) : (
            <p className="text-ink-subtle text-sm">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(event) => {
            onChange(event.target.value.slice(0, maxLength));
          }}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          className={fieldClass('resize-none p-3.5 text-[0.9375rem] leading-relaxed')}
        />
      )}

      <p className="text-ink-subtle mt-1 text-right text-xs">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
