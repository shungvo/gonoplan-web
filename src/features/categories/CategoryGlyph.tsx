import type { ReactNode } from 'react';
import {
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
} from 'lucide-react';

interface GlyphProps {
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  strokeWidth?: number | undefined;
}

/**
 * Category slug → rendered icon.
 *
 * The map holds *element factories*, not component references. Looking up a
 * component and rendering it as `<Icon />` reads naturally but assigns a
 * component to a variable during render, which React's compiler rules reject:
 * a dynamic component identity remounts and resets state on every render.
 * Calling a function that returns an element sidesteps that entirely.
 *
 * Deliberately mirrors the marker glyphs in `lib/map/markers.ts`, so a cafe
 * looks like a cafe whether it is a pin on the map or a card in a rail.
 */
const GLYPHS: Record<string, (props: GlyphProps) => ReactNode> = {
  cafe: (p) => <Coffee {...p} />,
  'specialty-coffee': (p) => <Coffee {...p} />,
  'rooftop-cafe': (p) => <Building2 {...p} />,
  restaurant: (p) => <Soup {...p} />,
  vietnamese: (p) => <Soup {...p} />,
  seafood: (p) => <Fish {...p} />,
  'street-food': (p) => <ShoppingCart {...p} />,
  bar: (p) => <Martini {...p} />,
  nightlife: (p) => <Moon {...p} />,
  hotel: (p) => <Bed {...p} />,
  homestay: (p) => <Home {...p} />,
  'tourist-attraction': (p) => <Sparkles {...p} />,
  nature: (p) => <Leaf {...p} />,
  museum: (p) => <Landmark {...p} />,
  entertainment: (p) => <Ticket {...p} />,
  cinema: (p) => <Clapperboard {...p} />,
  shopping: (p) => <ShoppingBag {...p} />,
  other: (p) => <Circle {...p} />,
};

export function CategoryGlyph({
  slug,
  className,
  color,
  strokeWidth = 1.5,
}: {
  slug: string;
  className?: string | undefined;
  color?: string | undefined;
  strokeWidth?: number | undefined;
}): ReactNode {
  const render = GLYPHS[slug] ?? GLYPHS['other']!;
  return render({
    className,
    strokeWidth,
    ...(color ? { style: { color } } : {}),
  });
}
