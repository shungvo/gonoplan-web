/**
 * The four tab glyphs, drawn here rather than imported.
 *
 * lucide has no filled variants, and filling its outlines does not work: its
 * `Compass` is a circle plus a needle polygon, so `fill="currentColor"` gives
 * a solid disc with the needle lost inside it. Every icon set that offers a
 * selected state ships two drawings per symbol for exactly this reason.
 *
 * Each of these is one silhouette rendered two ways — the same path, filled or
 * not — so selecting a tab changes the weight of the shape without changing
 * the shape. That is what makes the switch read as emphasis rather than as a
 * different icon appearing.
 *
 * The stroke stays on in both states. Dropping it when filled would shrink the
 * glyph by half a stroke width, and four icons that change size as you move
 * between them is the thing this was meant to fix.
 */

export interface TabIconProps {
  filled: boolean;
  className?: string;
}

const STROKE = 1.9;

function svgProps(filled: boolean, className?: string) {
  return {
    viewBox: '0 0 24 24',
    className,
    'aria-hidden': true,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...(filled ? {} : {}),
  };
}

/**
 * A gabled house with the doorway cut into the silhouette itself.
 *
 * The door is part of the outline rather than a second shape, so the filled
 * version keeps it — a solid house with a notch reads as a house; a solid
 * pentagon reads as nothing.
 */
export function HomeTabIcon({ filled, className }: TabIconProps) {
  return (
    <svg {...svgProps(filled, className)}>
      <path
        d="M12 2.7 L21.1 10.3 V21 H14.3 V14.7 H9.7 V21 H2.9 V10.3 Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

/**
 * A compass, with the needle punched out of the disc when filled.
 *
 * One path, two subpaths, `evenodd` — which is what keeps the needle visible
 * against a solid circle instead of disappearing into it.
 */
export function ExploreTabIcon({ filled, className }: TabIconProps) {
  return (
    <svg {...svgProps(filled, className)}>
      <path
        d="M12 2.9 A9.1 9.1 0 1 0 12 21.1 A9.1 9.1 0 1 0 12 2.9 Z
           M15.9 8.1 L13.6 13.6 L8.1 15.9 L10.4 10.4 Z"
        fill={filled ? 'currentColor' : 'none'}
        fillRule="evenodd"
      />
    </svg>
  );
}

/**
 * Two stops and the way between them.
 *
 * The connecting line is stroked in both states, because a line has no inside
 * to fill; the stops are what carry the change. That is also the part of the
 * glyph the eye lands on.
 */
export function PlanTabIcon({ filled, className }: TabIconProps) {
  return (
    <svg {...svgProps(filled, className)}>
      {/*
        The two stops sit either side of the centre — (6.6, 16.8) and
        (17.4, 7.2) have their midpoint at exactly (12, 12) — so the glyph is
        balanced in its box. The first draft put both low and left, and the
        whole icon leaned out of the row.

        The line starts and ends on the node edges rather than their centres,
        so nothing overlaps once the stroke is applied.
      */}
      <path d="M6.6 14.4 V10.2 A3 3 0 0 1 9.6 7.2 H15" />
      <circle cx="6.6" cy="16.8" r="2.4" fill={filled ? 'currentColor' : 'none'} />
      <circle cx="17.4" cy="7.2" r="2.4" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

/**
 * Head and shoulders, both closed shapes so the filled state is solid.
 *
 * The two are held apart by a hair. At the first attempt the head's lower edge
 * and the dome's upper edge overlapped once the stroke was applied, and the
 * outline version had a line running through the chin.
 */
export function ProfileTabIcon({ filled, className }: TabIconProps) {
  return (
    <svg {...svgProps(filled, className)}>
      <path
        d="M12 4.2 A3.7 3.7 0 1 0 12 11.6 A3.7 3.7 0 1 0 12 4.2 Z
           M19.4 21 A7.4 7.4 0 0 0 4.6 21 Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}
