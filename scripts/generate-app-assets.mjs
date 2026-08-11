/**
 * Draws every PNG a phone asks for before it will treat this as an app.
 *
 * They are generated rather than hand-exported, and committed rather than
 * built on demand, because two different things want them at two different
 * times: the manifest is served by Next at runtime, and iOS reads its splash
 * screens straight off the origin. Keeping them in `public/` means both work
 * without a build step, and keeping this script means the set can be redrawn
 * from one source when the mark changes.
 *
 *   node scripts/generate-app-assets.mjs
 *
 * `sharp` arrives with Next, so this adds no dependency.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BRAND = '#0f6ccd';
const BACKGROUND = '#ffffff';

/**
 * The mark: a pin, because that is what the whole app is made of.
 *
 * Drawn on a 512 grid so every size below is a clean division. No text — a
 * wordmark at 48px in a launcher is a grey smudge.
 */
function markSvg({ size = 512, inset = 0.62, background = null, radius = 0 }) {
  const pinHeight = size * inset;
  const centreX = size / 2;
  // Optically centred rather than mathematically: a pin is top-heavy, so
  // splitting its bounding box down the middle leaves it looking low.
  const top = (size - pinHeight) / 2 - size * 0.02;

  const headRadius = pinHeight * 0.36;
  const headCentreY = top + headRadius;
  const tipY = top + pinHeight;

  /*
   * The two straight edges of a pin are the tangents from its tip to its head.
   *
   * Computed rather than drawn with relative curve commands, which is how the
   * first attempt ended up with a notch down one side: an `a` arc followed by
   * a `c` curve has to be mirrored by hand, and it was not. Solving for the
   * tangent points makes the shape symmetric by construction.
   */
  const distance = tipY - headCentreY;
  const beta = Math.acos(headRadius / distance);
  const offsetX = headRadius * Math.sin(beta);
  const offsetY = headRadius * Math.cos(beta);

  const leftX = centreX - offsetX;
  const rightX = centreX + offsetX;
  const tangentY = headCentreY + offsetY;

  const round = (value) => Number(value.toFixed(2));

  const plate = background
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>`
    : '';

  const pinFill = background ? BACKGROUND : BRAND;
  const dotFill = background ?? BRAND;

  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${plate}
  <path
    d="M ${round(centreX)} ${round(tipY)}
       L ${round(leftX)} ${round(tangentY)}
       A ${round(headRadius)} ${round(headRadius)} 0 1 1 ${round(rightX)} ${round(tangentY)}
       Z"
    fill="${pinFill}"/>
  <circle cx="${round(centreX)}" cy="${round(headCentreY)}" r="${round(headRadius * 0.4)}" fill="${dotFill}"/>
</svg>`);
}

async function writePng(relativePath, svg, size) {
  const file = resolve(root, relativePath);
  await mkdir(dirname(file), { recursive: true });
  await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  return relativePath;
}

/**
 * iPhone splash screens.
 *
 * Android builds its own from the manifest's `background_color` and icon;
 * iOS will not, and shows a white flash followed by a screenshot of whatever
 * was last on screen unless it is handed an exact-size image per device. The
 * media queries that select them live in `app/layout.tsx`.
 */
const SPLASH_DEVICES = [
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
];

export function splashFileName({ width, height, ratio }) {
  return `icons/splash-${width}x${height}@${ratio}x.png`;
}

async function main() {
  const written = [];

  // Any-purpose icons keep their own rounded plate, because a launcher that
  // does not mask will show the square as drawn.
  written.push(await writePng('public/icons/icon-192.png', markSvg({ background: BRAND, radius: 112 }), 192));
  written.push(await writePng('public/icons/icon-512.png', markSvg({ background: BRAND, radius: 112 }), 512));

  /*
   * Maskable: full bleed, and the mark pulled well inside.
   *
   * Android crops this to whatever shape the launcher uses, and only the
   * middle 80% is guaranteed to survive. A mark drawn to the same inset as the
   * icons above loses its point to a circular mask.
   */
  written.push(
    await writePng(
      'public/icons/icon-maskable-512.png',
      markSvg({ background: BRAND, radius: 0, inset: 0.44 }),
      512,
    ),
  );

  // iOS composites its own rounded corners and refuses transparency, so this
  // is a square that bleeds to every edge.
  written.push(
    await writePng('public/icons/apple-touch-icon.png', markSvg({ background: BRAND, radius: 0 }), 180),
  );

  // The browser-tab favicon, small enough that the plate is most of what shows.
  written.push(await writePng('public/icons/favicon-32.png', markSvg({ background: BRAND, radius: 6 }), 32));

  for (const device of SPLASH_DEVICES) {
    const width = device.width * device.ratio;
    const height = device.height * device.ratio;
    // A quarter of the shorter edge: large enough to read as a brand, small
    // enough that it never crowds a narrow screen.
    const logo = Math.round(Math.min(width, height) * 0.25);

    const file = resolve(root, `public/${splashFileName(device)}`);
    await mkdir(dirname(file), { recursive: true });

    await sharp({
      create: { width, height, channels: 4, background: BACKGROUND },
    })
      .composite([{ input: await sharp(markSvg({ size: 512 })).resize(logo, logo).png().toBuffer() }])
      .png({ compressionLevel: 9 })
      .toFile(file);

    written.push(`public/${splashFileName(device)}`);
  }

  await writeFile(
    resolve(root, 'public/icons/README.md'),
    [
      '# Generated — do not edit by hand',
      '',
      'Run `node scripts/generate-app-assets.mjs` to redraw every file here.',
      'The mark is defined in that script; changing it there and re-running is',
      'the only supported way to change these.',
      '',
    ].join('\n'),
  );

  console.log(`Wrote ${String(written.length)} files:`);
  for (const path of written) console.log(`  ${path}`);
}

await main();
