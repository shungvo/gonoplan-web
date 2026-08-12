import { Fragment, type ReactNode } from 'react';
import { Camera, Globe, MapPin, Video, type LucideIcon } from 'lucide-react';
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

/**
 * Bold, italic, markdown links, and bare URLs.
 *
 * Ordered so `**` is tried before `*`, and so `[label](url)` is tried before
 * the bare-URL rule — otherwise the URL inside a markdown link would match on
 * its own and the label would be orphaned.
 *
 * Bare URLs are here because people paste them. Before this the grammar only
 * knew `[label](url)`, which is what the toolbar emits — so a TikTok link
 * pasted straight into a description rendered as grey text that could not be
 * clicked, and looked like the app had swallowed it.
 */
const INLINE =
  /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>]+)/g;

/** Sentence punctuation that follows a pasted URL rather than belonging to it. */
const TRAILING = /[.,;:!?'"]+$/;

/**
 * What a link looks like, decided from its own hostname.
 *
 * No favicon fetch. A favicon means every reader's browser announcing to
 * TikTok that they are looking at this page, and a broken image wherever the
 * site does not serve one — for a decoration. The app already answers this
 * question for places with no photograph, with a glyph drawn from what the
 * thing *is*, and a link is the same problem.
 *
 * The icons say what you will get rather than whose service it is: a video, a
 * photograph, a map. That is the part a reader is deciding on — and it also
 * means there is no brand mark here to keep up to date or to be wrong about.
 */
const FACES: Array<{ host: RegExp; icon: LucideIcon }> = [
  { host: /(^|\.)(tiktok\.com|youtube\.com|youtu\.be|fb\.watch)$/, icon: Video },
  { host: /(^|\.)instagram\.com$/, icon: Camera },
  { host: /(^|\.)(google\.[a-z.]+|goo\.gl)$/, icon: MapPin },
];

/** The hostname without `www.`, and the icon that goes with it. */
function linkFace(href: string): { host: string; Icon: LucideIcon } | null {
  let host: string;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  return { host, Icon: FACES.find((face) => face.host.test(host))?.icon ?? Globe };
}

/**
 * A link with nothing but a URL to show for itself.
 *
 * A raw "https://www.tiktok.com/@someone/video/7361029…" is forty characters
 * of noise carrying one useful word, so the chip shows the icon and the host
 * and drops the rest. The whole URL is still in `href` and in the title, which
 * is where a reader who wants it will look.
 */
function LinkChip({ href }: { href: string }) {
  const face = linkFace(href);
  if (!face) return <Fragment>{href}</Fragment>;

  const { host, Icon } = face;

  return (
    <a
      href={href}
      title={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="border-border bg-surface text-ink press-soft my-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 align-middle text-xs font-medium"
    >
      <Icon className="text-ink-muted size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{host}</span>
    </a>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${String(index)}`;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    /*
     * A bare URL, pasted rather than written as a link.
     *
     * The trailing punctuation is split off first: "…xem ở https://x.com/a."
     * ends a sentence, and the full stop is the sentence's, not the URL's.
     * Swallowing it produces a 404 that looks like the app mangled the link.
     */
    if (/^https?:\/\//i.test(part)) {
      const trailing = TRAILING.exec(part)?.[0] ?? '';
      const href = trailing ? part.slice(0, -trailing.length) : part;

      return (
        <Fragment key={key}>
          <LinkChip href={href} />
          {trailing}
        </Fragment>
      );
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

      /*
       * The author's words, not the hostname. Somebody who wrote
       * "[thực đơn](https://…)" chose that word on purpose, and replacing it
       * with "tiktok.com" would be the app overruling them. The icon comes
       * along so it still reads as leaving the app.
       */
      const face = linkFace(link[2]);

      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="text-primary inline-flex items-baseline gap-1 underline underline-offset-2"
        >
          {face && <face.Icon className="size-3.5 shrink-0 translate-y-0.5" aria-hidden />}
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

/** Exported for the tests; the component goes through `renderInline`. */
export const __testing = { linkFace, TRAILING, INLINE };
