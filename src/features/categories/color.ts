/**
 * The three ways a category colour is allowed on screen.
 *
 * Every category hue is generated at one lightness and one chroma (OKLCH
 * L=0.52 C=0.13 — see the API's `seed-data/categories.ts`), so the set reads
 * as a set. That guarantee survives only as far as the call sites: the app was
 * mixing `${colorHex}e6`, `${colorHex}1f` and `${colorHex}1a` inline, three
 * different alphas doing two different jobs, none of them named. A palette
 * that is systematic in the database and improvised in the markup is not a
 * system.
 *
 * So there are exactly three uses, and no fourth:
 *
 *   `solid`  — the badge. Opaque, white text on it, 5.18–5.93:1 at every hue.
 *   `tint`   — a wash to sit an icon or a selected chip on.
 *   `ink`    — the colour as type or as an icon, on white or on its own tint.
 *
 * `solid` is opaque on purpose. It used to be 90% over whatever photograph
 * happened to be behind it, which meant one category had one appearance on a
 * dark cover and another on a pale one, and its contrast with the white label
 * ranged from 4.3 to 5.9 depending on the picture. A badge is an identifier;
 * it has to look the same every time or it is not identifying anything.
 */

/** The badge, and the map marker. Opaque — see above. */
export function categorySolid(colorHex: string): string {
  return colorHex;
}

/**
 * A wash of the colour, for an icon's backing or a selected filter chip.
 *
 * 12% rather than the 10%/12% mix that was in the codebase. At L=0.52 every
 * hue lands in the same place at the same alpha, which is the point — the
 * tints are as much of a set as the solids are.
 */
export function categoryTint(colorHex: string): string {
  return `${colorHex}1f`;
}

/**
 * The colour as ink. Safe on white and on its own tint: the palette is
 * generated dark enough (L=0.52) that every hue clears AA as body text.
 */
export function categoryInk(colorHex: string): string {
  return colorHex;
}
