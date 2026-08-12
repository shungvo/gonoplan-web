import type { ReactNode } from 'react';
import {
  Bean,
  Bed,
  Building2,
  Circle,
  Clapperboard,
  Coffee,
  Fish,
  Home,
  Landmark,
  Leaf,
  Martini,
  Moon,
  ShoppingBag,
  ShoppingCart,
  Soup,
  Sparkles,
  Ticket,
  Utensils,
} from 'lucide-react';
import type { CategoryIconKey } from './api';

interface GlyphProps {
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  strokeWidth?: number | undefined;
}

/**
 * `iconKey` → rendered icon.
 *
 * This was keyed by category *slug*, which made the `iconKey` column dead
 * weight everywhere except the map: a category added through the admin screen
 * got whatever `GLYPHS[itsNewSlug]` returned, which was always the fallback
 * circle. Choosing an icon was impossible, because the mapping was compiled in
 * and the slug of a category that did not exist yet could not be in it.
 *
 * Keyed by `iconKey` the vocabulary is shared with `lib/map/markers.ts`, so a
 * cafe looks like a cafe whether it is a pin on the map, a chip in a rail, or
 * the stand-in for a place with no photograph — and picking `cup` in the admin
 * form changes all three.
 *
 * `Record<CategoryIconKey, …>` and not `Record<string, …>`: the key type comes
 * from the generated contract, so adding a key to the API's enum without
 * drawing it here fails the build rather than shipping a silent circle.
 *
 * The map holds *element factories*, not component references. Looking up a
 * component and rendering it as `<Icon />` reads naturally but assigns a
 * component to a variable during render, which React's compiler rules reject:
 * a dynamic component identity remounts and resets state on every render.
 * Calling a function that returns an element sidesteps that entirely.
 */
const GLYPHS: Record<CategoryIconKey, (props: GlyphProps) => ReactNode> = {
  cup: (p) => <Coffee {...p} />,
  bean: (p) => <Bean {...p} />,
  skyline: (p) => <Building2 {...p} />,
  bowl: (p) => <Utensils {...p} />,
  pho: (p) => <Soup {...p} />,
  fish: (p) => <Fish {...p} />,
  cart: (p) => <ShoppingCart {...p} />,
  glass: (p) => <Martini {...p} />,
  moon: (p) => <Moon {...p} />,
  bed: (p) => <Bed {...p} />,
  house: (p) => <Home {...p} />,
  sparkle: (p) => <Sparkles {...p} />,
  leaf: (p) => <Leaf {...p} />,
  column: (p) => <Landmark {...p} />,
  ticket: (p) => <Ticket {...p} />,
  film: (p) => <Clapperboard {...p} />,
  bag: (p) => <ShoppingBag {...p} />,
  dot: (p) => <Circle {...p} />,
};

/** For the completeness test — `satisfies` proves each key is valid, not that none is missing. */
export const __testing = { glyphKeys: Object.keys(GLYPHS) };

export function CategoryGlyph({
  iconKey,
  className,
  color,
  strokeWidth = 1.5,
}: {
  /**
   * The contract's union, so a call site holding a DTO cannot pass something
   * this cannot draw, and the table above is checked for completeness against
   * it at compile time.
   */
  iconKey: CategoryIconKey;
  className?: string | undefined;
  color?: string | undefined;
  strokeWidth?: number | undefined;
}): ReactNode {
  /*
   * Guarded even though the type says it cannot miss.
   *
   * The union is a claim about the contract, not a guarantee about the wire:
   * the column is plain text, and an endpoint that forgets to narrow sends
   * whatever it holds. One did — the admin list returned its `$queryRaw` rows
   * untouched — and a category stored as `iconKey: 'heart'` turned this into
   * `render is not a function` and took the entire page down. A missing shape
   * is worth a neutral dot, never a blank screen.
   */
  const render = GLYPHS[iconKey] ?? GLYPHS.dot;
  return render({
    className,
    strokeWidth,
    ...(color ? { style: { color } } : {}),
  });
}
