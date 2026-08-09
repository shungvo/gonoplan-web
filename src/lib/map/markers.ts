/**
 * Category marker sprites.
 *
 * Markers are drawn once into images and rendered by MapLibre as a symbol
 * layer, on the GPU. The obvious alternative — one absolutely-positioned DOM
 * node per place — means several hundred elements being re-laid-out on every
 * frame of a pan, which is guaranteed jank on a mid-range Android and exactly
 * the "don't make the app lag" constraint in §17.
 *
 * §15 asks for premium custom markers rather than raw emoji, so each pin is
 * composed here: a soft-3D teardrop in the category colour, a white face, and a
 * geometric glyph. Drawing to canvas rather than shipping a pre-built sprite
 * sheet means a category added in the database gets a correct marker with no
 * asset pipeline.
 */

/**
 * Logical pin size in CSS pixels; scaled by device pixel ratio when rasterised.
 *
 * Sized against a map that occupies part of a phone screen rather than all of
 * it. At 40x50 the pins dominated the tiles underneath and three of them filled
 * a district — the marker should point at the map, not replace it.
 */
const PIN_WIDTH = 30;
const PIN_HEIGHT = 38;
const GLYPH_BOX = 12;

/**
 * Glyphs on a 24×24 grid, matching the `iconKey` values seeded in
 * prisma/seed-data/categories.ts. Deliberately simple: at 20px, detail becomes
 * noise, and a shape that reads instantly beats one that is accurate.
 */
const GLYPH_PATHS: Record<string, string> = {
  cup: 'M5 4h11v8a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V4Zm11 2h2.5a2.5 2.5 0 0 1 0 5H16V6ZM4 20h13v1.5H4V20Z',
  bean: 'M12 3c4.5 0 7.5 3.4 7.5 7.9 0 5.3-4 9.1-8.4 9.1C7 20 4.5 17.4 4.5 13.6 4.5 8 8 3 12 3Zm-1 4.2c-1.9 1.6-3 3.9-3 6.3',
  skyline: 'M3 21V9l5-3v5l5-3v4l6-3v12H3Zm4-3h2v-3H7v3Zm5 0h2v-3h-2v3Z',
  bowl: 'M3 10h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9Zm3.5-6.5c1.5 1 1.5 2.5 0 3.5m4-3.5c1.5 1 1.5 2.5 0 3.5m4-3.5c1.5 1 1.5 2.5 0 3.5',
  pho: 'M3 10h18a9 9 0 0 1-9 9 9 9 0 0 1-9-9Zm2-4c1.2.8 1.2 2 0 2.8M9 5c1.2.8 1.2 2 0 2.8M13 6c1.2.8 1.2 2 0 2.8',
  fish: 'M2 12c3-4.5 7-6.5 11-6.5 3.4 0 6 1.7 7.5 3.5-1.5 2.6-4 6.5-8.5 6.5C7.5 15.5 4.5 14.3 2 12Zm20-3.5L18 12l4 3.5v-7ZM9 11h.01',
  cart: 'M3 4h2.5l2.2 10.5h9.6L19 7H7M9 20a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 9 20Zm8 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z',
  glass: 'M5 3h14l-6 8v7h3.5v2h-9v-2H11v-7L5 3Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  bed: 'M3 7v11m0-5h18v5M3 13V9h7a3 3 0 0 1 3 3v1M21 18v-5a3 3 0 0 0-3-3h-1',
  house: 'M4 11 12 4l8 7v9h-5.5v-5.5h-5V20H4v-9Z',
  sparkle: 'M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9l2-6.5ZM19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8L19 3Z',
  leaf: 'M20 4c0 9-5.5 14-12 14-1.4 0-2.7-.3-4-.8C4.6 9.7 10.5 4 20 4ZM4 20c3-5 7-8 11-9.5',
  column: 'M3 20h18M5 20V9m4.5 11V9m5 11V9M19 20V9M2.5 9h19L12 3 2.5 9Z',
  ticket: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm11-2v12',
  film: 'M3 5h18v14H3V5Zm0 4.5h18M3 14.5h18M7.5 5v14m9-14v14',
  bag: 'M5 8h14l-1 12H6L5 8Zm3.5 0V6a3.5 3.5 0 0 1 7 0v2',
  dot: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
};

const FALLBACK_GLYPH = GLYPH_PATHS['dot'] ?? '';

/** Glyphs drawn with fills read as blobs at this size; strokes stay legible. */
const STROKE_GLYPHS = new Set(['bowl', 'pho', 'bed', 'column', 'fish', 'bean', 'film', 'leaf']);

export interface MarkerSpec {
  categoryId: string;
  iconKey: string;
  colorHex: string;
}

export interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const num = Number.parseInt(value.length === 3 ? value.replace(/(.)/g, '$1$1') : value, 16);

  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(((num >> 16) & 0xff) * (1 + amount));
  const g = clamp(((num >> 8) & 0xff) * (1 + amount));
  const b = clamp((num & 0xff) * (1 + amount));

  return `rgb(${String(r)},${String(g)},${String(b)})`;
}

/**
 * Teardrop outline: a circular head closed by two tangent lines to a point.
 *
 * The arc must sweep over the *top* of the head. Canvas angles put π/2 at the
 * bottom (y grows downward), so sweeping the wrong way produces a crescent with
 * two horns rather than a pin — visually obvious, but easy to write.
 *
 * For centre O, tip P directly below at distance d, and radius r, the tangent
 * points sit at ±acos(r/d) either side of the downward vertical: triangle OTP
 * is right-angled at the tangent point T, so cos(∠TOP) = |OT|/|OP| = r/d.
 * Sweeping between them the long way round covers the head exactly.
 */
function pinPath(width: number, height: number): Path2D {
  const path = new Path2D();
  const radius = width / 2;
  const cx = width / 2;
  const cy = radius;

  const tipY = height - 1;
  const tangentOffset = Math.acos(radius / (tipY - cy));

  const DOWN = Math.PI / 2;
  path.arc(
    cx,
    cy,
    radius,
    DOWN + tangentOffset, // left tangent point
    DOWN - tangentOffset + Math.PI * 2, // right tangent point, the long way
    false,
  );
  path.lineTo(cx, tipY);
  path.closePath();

  return path;
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  spec: MarkerSpec,
  width: number,
  height: number,
): void {
  const pin = pinPath(width, height);

  // Ambient shadow before the fill, so the pin reads as sitting above the map
  // rather than printed on it — the layered-depth direction from §16.
  ctx.save();
  ctx.shadowColor = 'rgba(31,31,41,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, shade(spec.colorHex, 0.18));
  gradient.addColorStop(1, shade(spec.colorHex, -0.14));
  ctx.fillStyle = gradient;
  ctx.fill(pin);
  ctx.restore();

  // Hairline rim: separates adjacent same-colour pins that would otherwise
  // merge into one shape when clustered tightly.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.25;
  ctx.stroke(pin);

  // White face. Sized so the glyph sits inside a visible ring rather than
  // filling the disc edge to edge, which reads as a smudge at map scale.
  const faceRadius = width / 2 - 4.5;
  ctx.beginPath();
  ctx.arc(width / 2, width / 2, faceRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Glyph, scaled from its 24×24 grid and centred on the face.
  const glyph = new Path2D(GLYPH_PATHS[spec.iconKey] ?? FALLBACK_GLYPH);
  const scale = GLYPH_BOX / 24;

  ctx.save();
  ctx.translate(width / 2 - GLYPH_BOX / 2, width / 2 - GLYPH_BOX / 2);
  ctx.scale(scale, scale);

  if (STROKE_GLYPHS.has(spec.iconKey)) {
    ctx.strokeStyle = shade(spec.colorHex, -0.1);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(glyph);
  } else {
    ctx.fillStyle = shade(spec.colorHex, -0.1);
    ctx.fill(glyph);
  }

  ctx.restore();
}

/**
 * Rasterises one category pin.
 *
 * Returns `null` when there is no 2D context, which happens in jsdom and in
 * server rendering. Callers skip registration rather than crashing — a missing
 * sprite degrades to MapLibre's default circle, not a blank screen.
 */
export function renderMarkerImage(spec: MarkerSpec, pixelRatio: number): RasterImage | null {
  const width = Math.ceil(PIN_WIDTH * pixelRatio);
  const height = Math.ceil(PIN_HEIGHT * pixelRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(pixelRatio, pixelRatio);
  drawPin(ctx, spec, PIN_WIDTH, PIN_HEIGHT);

  const image = ctx.getImageData(0, 0, width, height);
  return { width, height, data: image.data };
}

/**
 * Cluster bubble.
 *
 * Sized by count so density is readable before zooming in — a screen of
 * identical bubbles conveys nothing about where the places actually are.
 */
export function renderClusterImage(
  size: number,
  colorHex: string,
  pixelRatio: number,
): RasterImage | null {
  const dimension = Math.ceil(size * pixelRatio);

  const canvas = document.createElement('canvas');
  canvas.width = dimension;
  canvas.height = dimension;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(pixelRatio, pixelRatio);

  const centre = size / 2;

  // Soft halo, then the solid core — reads as a group of pins rather than one
  // oversized pin.
  ctx.beginPath();
  ctx.arc(centre, centre, centre - 1, 0, Math.PI * 2);
  ctx.fillStyle = `${colorHex}26`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centre, centre, centre - 6, 0, Math.PI * 2);
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, shade(colorHex, 0.15));
  gradient.addColorStop(1, shade(colorHex, -0.12));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const image = ctx.getImageData(0, 0, dimension, dimension);
  return { width: dimension, height: dimension, data: image.data };
}

export const markerImageId = (categoryId: string) => `pin-${categoryId}`;
export const CLUSTER_IMAGE_SMALL = 'cluster-sm';
export const CLUSTER_IMAGE_MEDIUM = 'cluster-md';
export const CLUSTER_IMAGE_LARGE = 'cluster-lg';
