'use client';

import dynamic from 'next/dynamic';
import type { MapCanvasProps } from './MapCanvas';

/**
 * The client-only boundary for the map.
 *
 * MapLibre touches `window` and `document` at module scope, so importing it
 * into a server-rendered tree crashes the render. `ssr: false` is only honoured
 * inside a Client Component in this version of Next, which is why this file
 * carries the directive rather than the page that renders it.
 *
 * Splitting it out also keeps ~200 KB of WebGL renderer off the initial bundle
 * — it loads alongside the shell instead of blocking it.
 */
const MapCanvas = dynamic(
  () => import('./MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    // Matches the canvas's own loading state and the final gradient, so there
    // is no flash or layout shift when the real map takes over.
    loading: () => (
      <div className="h-full w-full animate-pulse bg-gradient-to-br from-primary-tint via-surface to-accent-tint" />
    ),
  },
);

export function MapView(props: MapCanvasProps) {
  return <MapCanvas {...props} />;
}
