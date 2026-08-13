import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';

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
 * Matching is by role, against the source-layer names of both schemas the app
 * can load — OpenMapTiles for the keyless basemap, Goong's own for the vendor
 * one. They share nothing: this file used to claim otherwise and was wrong,
 * which cost the shipping basemap its palette until a real key made the
 * difference visible. Anything unmatched keeps the style's own colour rather
 * than being guessed at.
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
 * Two schemas, one set of roles.
 *
 * The file header used to say both providers serve OpenMapTiles. They do not.
 * Goong ships its own schema — water is `ocean` and `riversandlakes`, roads are
 * `streets`, buildings are `VN_Building`, places are `vietnam_administrator`,
 * and POIs are `point_map` — so a palette written against OpenMapTiles names
 * landed almost entirely on the development basemap and did close to nothing on
 * the one that ships.
 *
 * That went unnoticed because it cannot be seen without a key. `applyMapTheme`
 * returning a count was meant to catch exactly this, and the first time anyone
 * could read that count was the first time a real key existed.
 *
 * Listing both vendors' names against a role, rather than branching on which
 * provider loaded, keeps the rule where it belongs: a layer *is* water, and
 * which company drew it is not the palette's business.
 */
const WATER_LAYERS = new Set(['water', 'waterway', 'ocean', 'riversandlakes']);
const GREENERY_LAYERS = new Set(['park', 'forest', 'landcover_natural']);
const LANDUSE_LAYERS = new Set(['landuse', 'landuser', 'landcover_human_made']);
const BUILDING_LAYERS = new Set(['building', 'VN_Building']);
const ROAD_LAYERS = new Set(['transportation', 'streets']);
const WATER_LABEL_LAYERS = new Set(['water_name', 'rivernames', 'lakenames']);

/**
 * Source layers whose labels we drop entirely.
 *
 * The basemap's own points of interest are the direct competitor of the pins
 * this app exists to show — a screen of bus-stop and shop icons with our
 * markers somewhere among them reads as noise, and the user cannot tell which
 * symbols are ours. Grab, Google and Apple all suppress the base POI layer at
 * this zoom for exactly that reason. Place names stay: they are orientation,
 * not clutter.
 *
 * Goong's half of this list is not a guess: its POIs live in `point_map`, with
 * stations, airports, peaks and street trees each in their own layer. Without
 * them the Explore map drew a Burberry icon and a "Catwalk Night Spot" label
 * over the top of our own markers.
 */
const SUPPRESSED_SOURCE_LAYERS = new Set([
  // OpenMapTiles
  'poi',
  'aerodrome_label',
  'mountain_peak',
  // Goong
  'point_map',
  'rail_station',
  'airport',
  'mountain',
  'trees',
]);

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
/** `undefined` never matches a set, so the guard reads the same everywhere. */
function inSet(set: ReadonlySet<string>, sourceLayer: string | undefined): boolean {
  return sourceLayer !== undefined && set.has(sourceLayer);
}

function labelColour(layerId: string, sourceLayer: string | undefined): string {
  if (inSet(WATER_LABEL_LAYERS, sourceLayer) || /water|waterway|marine/i.test(layerId)) {
    return THEME.waterLabel;
  }
  if (/road|highway|street|transportation/i.test(layerId)) return THEME.inkMuted;
  return THEME.ink;
}

function fillColour(layerId: string, sourceLayer: string | undefined): string | null {
  if (inSet(WATER_LAYERS, sourceLayer) || /water|ocean|sea|river|lake/i.test(layerId)) {
    return THEME.water;
  }
  if (inSet(BUILDING_LAYERS, sourceLayer) || /building/i.test(layerId)) return THEME.building;
  if (inSet(GREENERY_LAYERS, sourceLayer) || /park|wood|forest|grass|garden|pitch|golf/i.test(layerId)) {
    return THEME.greenery;
  }
  if (sourceLayer === 'landcover') {
    return /sand|beach|desert/i.test(layerId) ? THEME.sand : THEME.greenery;
  }
  if (inSet(LANDUSE_LAYERS, sourceLayer)) return THEME.landuse;
  if (inSet(ROAD_LAYERS, sourceLayer)) return isMajorRoad(layerId) ? THEME.trunk : THEME.road;
  return null;
}

function lineColour(layerId: string, sourceLayer: string | undefined): string | null {
  if (inSet(WATER_LAYERS, sourceLayer) || /water|river|stream/i.test(layerId)) {
    return THEME.water;
  }
  if (sourceLayer === 'boundary' || /boundary|admin|border/i.test(layerId)) return THEME.boundary;
  if (/rail|transit|subway|ferry|aerialway/i.test(layerId)) return THEME.rail;
  if (inSet(ROAD_LAYERS, sourceLayer) || /road|highway|street|bridge|tunnel/i.test(layerId)) {
    if (isCasing(layerId)) return isMajorRoad(layerId) ? THEME.trunkCasing : THEME.roadCasing;
    return isMajorRoad(layerId) ? THEME.trunk : THEME.road;
  }
  if (inSet(BUILDING_LAYERS, sourceLayer)) return THEME.buildingOutline;
  /*
   * Goong draws its landuse borders as lines in `landuser`. Left unmatched they
   * kept the vendor's own tone, which is the one visible seam a fill-only
   * palette leaves behind.
   */
  if (inSet(LANDUSE_LAYERS, sourceLayer)) return THEME.landuse;
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
 * Returns what it touched against what it saw, so a caller can tell "the theme
 * applied" from "the theme silently did nothing" — the second is what an
 * unfamiliar provider schema looks like from the outside.
 *
 * `total` is here because `styled === 0` turned out to be too weak a test. On
 * Goong the id regexes caught the roads while every source-layer check missed,
 * so the count was reassuringly non-zero on a map that had barely been themed
 * at all. A ratio catches that; a zero check does not.
 */
export function applyMapTheme(map: MapLibreMap): {
  styled: number;
  skipped: number;
  total: number;
} {
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

  return { styled, skipped, total: layers.length };
}

/**
 * The label a Vietnamese app should be reading.
 *
 * `name` is OSM's local name, so in Vietnam it is already Vietnamese — it leads
 * for that reason, with `name:vi` ahead of it only for the features that carry
 * an explicit tag. `name:latin` is last and exists so a feature that has
 * nothing else still draws something.
 */
const LOCAL_NAME: ExpressionSpecification = [
  'coalesce',
  ['get', 'name:vi'],
  ['get', 'name'],
  ['get', 'name:latin'],
];

/**
 * True when this layer's text is a place's name rather than something else.
 *
 * A style also draws road shields from `ref` and addresses from `housenumber`.
 * Rewriting those to a name does not mislabel them — it blanks them, because
 * a motorway shield has no `name`, and missing labels read as missing data
 * rather than as a bug anyone would think to look for.
 */
function drawsAName(field: unknown): boolean {
  return JSON.stringify(field ?? null).includes('name');
}

/**
 * Puts the basemap's labels into Vietnamese.
 *
 * OpenMapTiles-schema styles — OpenFreeMap's Liberty among them — default their
 * labels to `name:latin`, and for Vietnam that resolves to the English exonym
 * often enough to notice: "Saigon River" and "Pasteur Street" sitting in an app
 * whose every other string is Vietnamese. The tiles carry the Vietnamese name
 * too; the style simply does not ask for it.
 *
 * Called only for the keyless basemap, because it is only the keyless basemap
 * that has the problem — a vendor selling maps of Vietnam ships Vietnamese
 * labels already, and rewriting a `text-field` on tiles whose properties we
 * have not seen risks blanking every label on the map.
 *
 * Guarded per layer for the same reason `applyMapTheme` is: this is someone
 * else's style, and one layer that refuses a write must not cost the others
 * theirs.
 */
export function localiseMapLabels(map: MapLibreMap): { localised: number; skipped: number } {
  const layers = map.getStyle().layers ?? [];
  let localised = 0;
  let skipped = 0;

  for (const layer of layers) {
    if (layer.type !== 'symbol') continue;
    if (!layer.layout || !('text-field' in layer.layout)) continue;
    if (!drawsAName(layer.layout['text-field'])) continue;

    try {
      map.setLayoutProperty(layer.id, 'text-field', LOCAL_NAME);
      localised += 1;
    } catch {
      skipped += 1;
    }
  }

  return { localised, skipped };
}
