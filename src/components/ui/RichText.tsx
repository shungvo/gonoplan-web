import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Renders the Markdown subset the editor can produce — as React elements.
 *
 * **No `dangerouslySetInnerHTML` anywhere.** Descriptions are user-submitted
 * and shown on a page that also carries a session, so HTML from the client is
 * a stored-XSS waiting to happen. Sanitising HTML is a filter that has to be
 * right every time against an attacker who only has to be right once;
 * producing React elements from a known grammar has no injection surface at
 * all, because a string never becomes markup.
 *
 * That is also why this is hand-written rather than `marked` + DOMPurify. The
 * grammar is exactly what the toolbar emits, so it is small enough to read in
 * one sitting — and a parser that cannot emit HTML cannot emit bad HTML.
 *
 * Plain text renders as plain text, so the thousands of existing descriptions
 * written before this keep working untouched.
 */

/** Bold, italic, and links. Ordered so `**` is tried before `*`. */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${String(index)}`;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link?.[1] && link[2]) {
      /*
       * http and https only.
       *
       * `[click](javascript:…)` is the oldest injection in the book, and
       * `data:text/html` is the same trick wearing a different scheme. An
       * unrecognised scheme degrades to its own text rather than vanishing —
       * the reader still sees what was written.
       */
      const safe = /^https?:\/\//i.test(link[2]);
      if (!safe) return <Fragment key={key}>{part}</Fragment>;

      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="text-primary underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

interface Block {
  type: 'heading' | 'paragraph' | 'bullets' | 'numbers';
  level?: number;
  lines: string[];
}

/**
 * Groups lines into blocks.
 *
 * Consecutive list items become one list, which is the difference between a
 * list and a column of separate one-item lists — invisible on screen, obvious
 * to a screen reader announcing "list, 1 item" five times.
 */
function toBlocks(source: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      // A blank line ends whatever was open, which is what makes two
      // paragraphs two paragraphs.
      blocks.push({ type: 'paragraph', lines: [] });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading?.[1] && heading[2]) {
      blocks.push({ type: 'heading', level: heading[1].length, lines: [heading[2]] });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet?.[1] !== undefined) {
      const last = blocks.at(-1);
      if (last?.type === 'bullets') last.lines.push(bullet[1]);
      else blocks.push({ type: 'bullets', lines: [bullet[1]] });
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered?.[1] !== undefined) {
      const last = blocks.at(-1);
      if (last?.type === 'numbers') last.lines.push(numbered[1]);
      else blocks.push({ type: 'numbers', lines: [numbered[1]] });
      continue;
    }

    const last = blocks.at(-1);
    if (last?.type === 'paragraph' && last.lines.length > 0) last.lines.push(line);
    else blocks.push({ type: 'paragraph', lines: [line] });
  }

  return blocks.filter((block) => block.lines.length > 0);
}

export function RichText({ source, className }: { source: string; className?: string }) {
  const blocks = toBlocks(source);

  return (
    <div className={cn('space-y-2.5 text-sm leading-relaxed', className)}>
      {blocks.map((block, index) => {
        const key = `block-${String(index)}`;

        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5';
          return (
            <Tag key={key} className="text-ink mt-3 text-sm font-semibold">
              {renderInline(block.lines[0] ?? '', key)}
            </Tag>
          );
        }

        if (block.type === 'bullets' || block.type === 'numbers') {
          const List = block.type === 'bullets' ? 'ul' : 'ol';
          return (
            <List
              key={key}
              className={cn(
                'text-ink-muted ml-5 space-y-1',
                block.type === 'bullets' ? 'list-disc' : 'list-decimal',
              )}
            >
              {block.lines.map((line, item) => (
                <li key={`${key}-${String(item)}`}>
                  {renderInline(line, `${key}-${String(item)}`)}
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={key} className="text-ink-muted">
            {/* Soft line breaks inside a paragraph are preserved: someone
                writing an address across two lines meant two lines. */}
            {block.lines.map((line, item) => (
              <Fragment key={`${key}-${String(item)}`}>
                {item > 0 && <br />}
                {renderInline(line, `${key}-${String(item)}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
