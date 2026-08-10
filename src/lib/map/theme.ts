import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Recolours the basemap to match the app.
 *
 * A palette transform applied to whatever style loaded, not a style JSON of our
 * own. Two reasons. A hand-authored style is thousands of lines that has to be
 * re-authored for every provider, and the provider is swappable by design
 * (docs/00-architecture.md §6) — Goong in production, OpenFreeMap in dev. And a
 * style file drifts from `globals.css` silently, whereas this reads like what
 * it is: our tokens, applied to someone else's cartography.
 *
 * The matching is on the OpenMapTiles schema — `water`, `landcover`,
 * `building`, `transportation`, `poi` — which is what both providers serve, so
 * the same rules land on both. Anything unmatched keeps the style's own colour
 * rather than being guessed at.
 */

/**
 * Pulled from the app's tokens and then desaturated.
 *
 * A basemap is background: every hue here is a step softer than the same colour
 * would be in the UI, because the map has to sit *under* pins, cards and a
 * route line without competing with any of them. Saturated map colours are the
 * single thing that makes a custom basemap look like a toy.
 */
const THEME = {
  /** Everything that is not water, green, or built on. */
  land: '#f7f9fc',
  water: '#c9ddf0',
  waterLabel: '#4a7ba4',
  /** Parks, woods, grass. */
  greenery: '#e0eee3',
  /** Zoned land — residential, commercial. A whisper away from `land`. */
  landuse: '#f1f4f8',
  sand: '#f5efe2',
  building: '#eaeef4',
  buildingOutline: '#e0e6ee',
  /** Road fill. White, so roads read as channels through the land. */
  road: '#ffffff',
  roadCasing: '#e3eaf3',
  /** Motorways and trunk roads get a warm tint so the hierarchy survives. */
  trunk: '#fdf6e8',
  trunkCasing: '#ecdfc4',
  rail: '#e5e9f0',
  boundary: '#dde4ed',
  ink: '#14202e',
  inkMuted: '#5a6b7d',
  halo: '#ffffff',
} as const;

/**
 * Source layers whose labels we drop entirely.
 *
 * The basemap's own points of interest are the direct competitor of the pins
 * this app exists to show — a screen of bus-stop and shop icons with our
 * markers somewhere among them reads as noise, and the user cannot tell which
 * symbols are ours. Grab, Google and Apple all suppress the base POI layer at
 * this zoom for exactly that reason. Place names stay: they are orientation,
 * not clutter.
 */
const SUPPRESSED_SOURCE_LAYERS = new Set(['poi', 'aerodrome_label', 'mountain_peak']);

/** Layers that draw the outline beneath a road rather than the road itself. */
function isCasing(layerId: string): boolean {
  return /casing|outline/i.test(layerId);
}

/** Motorway, trunk, primary — the roads that carry the map's hierarchy. */
function isMajorRoad(layerId: string): boolean {
  return /motorway|trunk|primary/i.test(layerId);
}

/**
 * Labels sit at two weights: places are read, roads are scanned.
 *
 * Giving both the same ink flattens the map into a wall of text — the road
 * names are only ever answering "which street is this", so they recede.
 */
function labelColour(layerId: string, sourceLayer: string | undefined): string {
  if (sourceLayer === 'water_name' || /water|waterway|marine/i.test(layerId)) {
    return THEME.waterLabel;
  }
  if (/road|highway|street|transportation/i.test(layerId)) return THEME.inkMuted;
  return THEME.ink;
}

function fillColour(layerId: string, sourceLayer: string | undefined): string | null {
  if (sourceLayer === 'water' || /water|ocean|sea|river|lake/i.test(layerId)) return THEME.water;
  if (sourceLayer === 'building' || /building/i.test(layerId)) return THEME.building;
  if (sourceLayer === 'park' || /park|wood|forest|grass|garden|pitch|golf/i.test(layerId)) {
    return THEME.greenery;
  }
  if (sourceLayer === 'landcover') {
    return /sand|beach|desert/i.test(layerId) ? THEME.sand : THEME.greenery;
  }
  if (sourceLayer === 'landuse') return THEME.landuse;
  if (sourceLayer === 'transportation') return isMajorRoad(layerId) ? THEME.trunk : THEME.road;
  return null;
}

function lineColour(layerId: string, sourceLayer: string | undefined): string | null {
  if (
    sourceLayer === 'water' ||
    sourceLayer === 'waterway' ||
    /water|river|stream/i.test(layerId)
  ) {
    return THEME.water;
  }
  if (sourceLayer === 'boundary' || /boundary|admin|border/i.test(layerId)) return THEME.boundary;
  if (/rail|transit|subway|ferry|aerialway/i.test(layerId)) return THEME.rail;
  if (sourceLayer === 'transportation' || /road|highway|street|bridge|tunnel/i.test(layerId)) {
    if (isCasing(layerId)) return isMajorRoad(layerId) ? THEME.trunkCasing : THEME.roadCasing;
    return isMajorRoad(layerId) ? THEME.trunk : THEME.road;
  }
  if (sourceLayer === 'building') return THEME.buildingOutline;
  return null;
}

/**
 * Applies the palette to a loaded style.
 *
 * Every write is guarded individually. A style is someone else's data — a
 * provider is free to ship a layer whose paint property is a data expression we
 * cannot overwrite, and one such layer must not take the whole basemap down
 * with it. A failure here costs one layer its colour, nothing more.
 *
 * Returns the number of layers it could not touch, so a caller can tell "the
 * theme applied" from "the theme silently did nothing" — the second is what a
 * schema change on the provider's side would look like.
 */
export function applyMapTheme(map: MapLibreMap): { styled: number; skipped: number } {
  const layers = map.getStyle().layers ?? [];
  let styled = 0;
  let skipped = 0;

  for (const layer of layers) {
    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined;

    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', THEME.land);
        styled += 1;
        continue;
      }

      if (layer.type === 'symbol') {
        if (sourceLayer !== undefined && SUPPRESSED_SOURCE_LAYERS.has(sourceLayer)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
          styled += 1;
          continue;
        }

        // Only layers that actually draw text. An icon-only layer has no
        // `text-color`, and writing one is a no-op at best.
        if (layer.layout && 'text-field' in layer.layout) {
          map.setPaintProperty(layer.id, 'text-color', labelColour(layer.id, sourceLayer));
          map.setPaintProperty(layer.id, 'text-halo-color', THEME.halo);
          map.setPaintProperty(layer.id, 'text-halo-width', 1.4);
          map.setPaintProperty(layer.id, 'text-halo-blur', 0.4);
          styled += 1;
        }
        continue;
      }

      if (layer.type === 'fill') {
        const colour = fillColour(layer.id, sourceLayer);
        if (colour === null) continue;
        map.setPaintProperty(layer.id, 'fill-color', colour);
        if (sourceLayer === 'building') {
          map.setPaintProperty(layer.id, 'fill-outline-color', THEME.buildingOutline);
        }
        styled += 1;
        continue;
      }

      if (layer.type === 'line') {
        const colour = lineColour(layer.id, sourceLayer);
        if (colour === null) continue;
        map.setPaintProperty(layer.id, 'line-color', colour);
        styled += 1;
        continue;
      }

      if (layer.type === 'fill-extrusion') {
        // 3D buildings, flattened to the same tone as the 2D ones. A discovery
        // map is read from directly overhead; extruded blocks only cast shadows
        // over the pins.
        map.setPaintProperty(layer.id, 'fill-extrusion-color', THEME.building);
        map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.6);
        styled += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return { styled, skipped };
}
