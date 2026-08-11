/**
 * A plan, drawn onto a canvas.
 *
 * Rendered in the browser rather than server-side with `next/og`. Satori needs
 * a font buffer handed to it at runtime, and the one this app needs has to
 * carry Vietnamese diacritics — which would mean shipping a font file into the
 * repo and loading it per request. The browser already has that font loaded,
 * so drawing here costs no bytes, no round trip, and works with no connection
 * at all.
 *
 * Deliberately knows nothing about plans, locales or translation: the caller
 * hands it lines of text that are already in the right language and format.
 * That keeps the layout maths in one place and the wording in another.
 */

export interface ShareImageStop {
  /** Already formatted — "09:00 – 10:30", or empty when the stop has no time. */
  time: string;
  name: string;
  /** Category and area, on one line. */
  meta: string;
}

export interface ShareImageInput {
  title: string;
  subtitle: string;
  stops: ShareImageStop[];
  footer: string;
}

/** Wide enough to stay sharp when a chat app scales it down. */
const WIDTH = 1080;
const PADDING = 72;
const TIME_COLUMN = 250;

const COLOURS = {
  background: '#ffffff',
  ink: '#14202e',
  muted: '#5a6b7d',
  subtle: '#8a9aab',
  border: '#e6ecf4',
  primary: '#0f6ccd',
};

/**
 * The app's own font, asked for by the name `next/font` generated.
 *
 * Read from the document rather than hardcoded, because that name is a build
 * artefact and changes without warning. The fallback matters: a canvas asked
 * for a font it does not have silently draws in something else, and for
 * Vietnamese that means missing diacritics rather than a different shape.
 */
function fontFamily(): string {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-geist-sans')
    .trim();

  return family ? `${family}, sans-serif` : 'sans-serif';
}

function wrap(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let line = words[0]!;

  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }

  lines.push(line);
  return lines;
}

/**
 * Measures first, then draws.
 *
 * The height depends on how many lines each name wraps to, and a canvas resize
 * clears everything already on it — so the layout has to be solved before a
 * single pixel is committed.
 */
export async function renderPlanImage(input: ShareImageInput): Promise<Blob> {
  // Without this the first draw can land before the webfont is ready, and the
  // whole image comes out in the fallback face.
  await document.fonts.ready;

  const family = fontFamily();
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('Canvas is unavailable');

  const nameWidth = WIDTH - PADDING * 2 - TIME_COLUMN;

  const rows = input.stops.map((stop) => {
    measure.font = `600 40px ${family}`;
    const nameLines = wrap(measure, stop.name, nameWidth);
    // Name lines, then the meta line, then the gap to the next row.
    const height = nameLines.length * 52 + (stop.meta ? 40 : 0) + 36;
    return { ...stop, nameLines, height };
  });

  const headerHeight = 96 + 52 + 48;
  const footerHeight = 96;
  const bodyHeight = rows.reduce((total, row) => total + row.height, 0);
  const height = PADDING + headerHeight + bodyHeight + footerHeight + PADDING;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = Math.round(height);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  context.fillStyle = COLOURS.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  let y = PADDING + 72;

  context.fillStyle = COLOURS.ink;
  context.font = `700 64px ${family}`;
  context.fillText(input.title, PADDING, y);

  y += 52;
  context.fillStyle = COLOURS.muted;
  context.font = `400 34px ${family}`;
  context.fillText(input.subtitle, PADDING, y);

  y += 48;
  context.strokeStyle = COLOURS.border;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PADDING, y);
  context.lineTo(WIDTH - PADDING, y);
  context.stroke();

  y += 56;

  for (const row of rows) {
    const rowTop = y;

    if (row.time) {
      context.fillStyle = COLOURS.primary;
      context.font = `600 36px ${family}`;
      context.fillText(row.time, PADDING, rowTop);
    }

    context.fillStyle = COLOURS.ink;
    context.font = `600 40px ${family}`;
    row.nameLines.forEach((line, index) => {
      context.fillText(line, PADDING + TIME_COLUMN, rowTop + index * 52);
    });

    if (row.meta) {
      context.fillStyle = COLOURS.subtle;
      context.font = `400 30px ${family}`;
      context.fillText(
        row.meta,
        PADDING + TIME_COLUMN,
        rowTop + row.nameLines.length * 52 + 4,
      );
    }

    y += row.height;
  }

  context.fillStyle = COLOURS.subtle;
  context.font = `500 30px ${family}`;
  context.fillText(input.footer, PADDING, canvas.height - PADDING);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      // PNG rather than JPEG: this is flat colour and text, where JPEG's
      // ringing around glyph edges is exactly the artefact you would notice.
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the image'));
    }, 'image/png');
  });
}
