'use client';

import { useSearchParams } from 'next/navigation';
import { PlacePageClient } from './[idOrSlug]/PlacePageClient';

/** Reads the place out of `?p=`; the screen itself is shared with the path route. */
export function PlaceQueryShell() {
  const idOrSlug = useSearchParams().get('p');
  return <PlacePageClient idOrSlug={idOrSlug} />;
}
