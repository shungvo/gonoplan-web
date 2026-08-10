'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// maplibre-gl v6 removed the default export — named imports only.
import {
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import 'maplibre-gl/dist/maplibre-gl.css';

import { resolveMapStyleProvider } from '@/lib/map/providers';
import { ensureMapWorker } from '@/lib/map/worker';
import {
  CLUSTER_IMAGE_LARGE,
  CLUSTER_IMAGE_MEDIUM,
  CLUSTER_IMAGE_SMALL,
  markerImageId,
  renderClusterImage,
  renderMarkerImage,
} from '@/lib/map/markers';
import type { MapBounds, PlaceMarker } from '@/lib/map/types';
import { fetchCategories, flattenCategories } from '@/features/categories/api';
import { useMapMarkers } from '../hooks/useMapMarkers';
import { cn } from '@/lib/utils/cn';

const SOURCE_ID = 'places';
const CLUSTER_LAYER = 'places-clusters';
const CLUSTER_COUNT_LAYER = 'places-cluster-count';
const MARKER_LAYER = 'places-markers';

const MARKER_SELECTED_LAYER = 'places-marker-selected';
const ROUTE_SOURCE = 'route';
const ROUTE_CASING_LAYER = 'route-casing';
const ROUTE_LAYER = 'route-line';

/**
 * The font stack the basemap itself already renders labels with.
 *
 * A symbol layer with no `text-font` falls back to MapLibre's default —
 * "Open Sans Regular, Arial Unicode MS Regular" — which OpenFreeMap does not
 * host. Every cluster bubble then fired a 404 for its glyph range and the
 * number was drawn through a local fallback path.
 *
 * Hardcoding a font that OpenFreeMap does host would only move the failure to
 * Goong, which is the production provider. Borrowing whatever the style's own
 * labels use resolves on any provider, because that font is by definition
 * served by that style's glyph endpoint.
 */
function basemapFont(map: MapLibreMap): string[] | null {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;

    const font: unknown = layer.layout?.['text-font'];
    if (!Array.isArray(font)) continue;

    // `text-font` may also be an expression — ["array", ...] or a zoom ramp.
    // Only a plain stack of names can be copied verbatim, and it is the only
    // form that survives being handed to a different layer.
    const names = font.filter((entry): entry is string => typeof entry === 'string');
    if (names.length > 0 && names.length === font.length) return names;
  }
  return null;
}

export interface MapCanvasProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  categorySlugs?: string[];
  /** Rendered as a pulsing dot; null when there is no usable position. */
  userLocation?: { latitude: number; longitude: number } | null;
  /** Renders enlarged and above its neighbours. */
  selectedPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
  onViewportChange?: (bounds: MapBounds, zoom: number) => void;
  /** GeoJSON [lng, lat] pairs. Drawn beneath the markers, and fitted on change. */
  route?: Array<[number, number]> | null;
  /**
   * Off for a map that is a glance rather than a workspace — the strip behind
   * Explore's list, where the buttons would crowd a 320px-tall map that has a
   * "Full map" button two centimetres away. Pinch still zooms either way.
   */
  showZoomControls?: boolean;
  /** How far the zoom buttons sit above the map's bottom edge, as a CSS length. */
  controlsBottomOffset?: string;
  className?: string;
}

export function MapCanvas({
  center,
  zoom = 14,
  categorySlugs = [],
  userLocation = null,
  selectedPlaceId = null,
  onSelectPlace,
  onViewportChange,
  route = null,
  showZoomControls = true,
  controlsBottomOffset = '2.25rem',
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const spritesLoadedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const { data: markerPage } = useMapMarkers(bounds, currentZoom, categorySlugs);

  /*
   * The route line, and the camera that frames it.
   *
   * Fitting the bounds is the part that matters: a route drawn at whatever
   * zoom the user left the map at is usually one line leaving the screen, and
   * the first thing anyone does is pinch out to find the rest of it.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: route ?? [] },
    });

    if (!route || route.length < 2) return;

    const lngs = route.map(([lng]) => lng);
    const lats = route.map(([, lat]) => lat);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        // Asymmetric on purpose: the bottom of a map screen belongs to the
        // sheet or the carousel, so a route centred in the geometric middle
        // ends up half-covered.
        padding: { top: 90, bottom: 220, left: 48, right: 48 },
        duration: 600,
        maxZoom: 16,
      },
    );
  }, [route, isReady]);

  // ─── Map lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Must run before the map is constructed — without it MapLibre never
    // spawns its worker and never requests a single tile.
    ensureMapWorker();

    const style = resolveMapStyleProvider().getStyle();

    const map = new MapLibreMap({
      container: containerRef.current,
      style: style.styleUrl,
      center: [center.longitude, center.latitude],
      zoom,
      // The style supplies its own attribution; adding ours duplicated the
      // OpenStreetMap credit across two lines over the map.
      attributionControl: { compact: true },
      // The default rotate/pitch gestures fight one-handed panning on a phone
      // and give nothing back for a 2D discovery map.
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      // Cooperative gestures are for embedded maps; here the map *is* the page.
      maxZoom: 19,
      minZoom: 4,
    });

    map.touchZoomRotate.disableRotation();

    /*
     * MapLibre reports tile failures, style errors and lost WebGL contexts
     * through this event rather than by throwing. Without a listener they are
     * swallowed and the map simply never appears — which looks like a hung
     * component and is genuinely hard to diagnose.
     */
    map.on('error', (event) => {
      const message = event.error.message;

      /*
       * `/tile/i` used to be the filter here, and it matched the provider's own
       * hostname — `tiles.openfreemap.org` — so every style, sprite and source
       * failure from OpenFreeMap was swallowed as if it were an edge-of-coverage
       * 404. The map went blank and reported nothing.
       *
       * A missing tile is identified by the event carrying a sourceId, not by
       * the word appearing somewhere in a URL.
       */
      const isMissingTile = 'sourceId' in event && event.sourceId !== undefined;
      if (isMissingTile) {
        // Still not shown to the user — the edges of coverage are normal — but
        // no longer invisible to whoever is debugging.
        console.warn('[map] tile failed', message);
        return;
      }

      setMapError(message);
    });

    map.on('load', () => {
      /*
       * Everything in here is wrapped, because `setIsReady(true)` is the last
       * statement and a throw before it left the loading placeholder covering
       * a perfectly working map — forever, with nothing logged. MapLibre's
       * `error` event does not receive exceptions thrown inside a `load`
       * listener, so the failure was invisible from every direction: the
       * basemap rendered underneath, the style and sprites loaded, and the
       * screen was a pale gradient.
       *
       * Now a layer that fails says so, and the map is revealed either way.
       */
      try {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          // MapLibre's built-in clustering — no supercluster dependency, and it
          // runs in a worker rather than on the main thread.
          cluster: true,
          // Clustering stops at street zoom. Above this, tapping a specific place
          // is the whole interaction, and a bubble the user has to zoom past
          // twice more is friction rather than density.
          clusterMaxZoom: 14,
          clusterRadius: 45,
        });

        map.addSource(ROUTE_SOURCE, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] },
          },
        });

        /*
         * Two lines, not one. The wider casing underneath is what keeps a route
         * readable where it crosses a road of a similar colour — without it the
         * line disappears into the basemap exactly where someone is checking
         * which turning is theirs.
         *
         * Added before the marker layers so pins stay on top: the route is
         * context, the destination is the point.
         */
        map.addLayer({
          id: ROUTE_CASING_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 18, 14],
            'line-opacity': 0.9,
          },
        });

        map.addLayer({
          id: ROUTE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0f6ccd',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 18, 9],
          },
        });

        map.addLayer({
          id: CLUSTER_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'icon-image': [
              'step',
              ['get', 'point_count'],
              CLUSTER_IMAGE_SMALL,
              10,
              CLUSTER_IMAGE_MEDIUM,
              30,
              CLUSTER_IMAGE_LARGE,
            ],
            'icon-allow-overlap': true,
            'icon-size': 1,
          },
        });

        const clusterFont = basemapFont(map);

        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 11,
            'text-allow-overlap': true,
            ...(clusterFont ? { 'text-font': clusterFont } : {}),
          },
          paint: { 'text-color': '#ffffff' },
        });

        map.addLayer({
          id: MARKER_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': ['concat', 'pin-', ['get', 'categoryId']],
            // Anchored at the tip so the pin points at the actual coordinate
            // rather than hovering with its centre on it.
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-size': 1,
          },
        });

        /*
         * Selection is a second layer filtered to one id, not a feature-state
         * expression on `icon-size`.
         *
         * `icon-size` is a *layout* property, and the style spec forbids
         * feature-state in layout properties — MapLibre rejects the whole layer
         * with "feature-state data expressions are not supported with layout
         * properties" and the map never finishes loading.
         *
         * A filtered overlay also renders the selected pin above its neighbours,
         * which a size bump alone would not do.
         */
        map.addLayer({
          id: MARKER_SELECTED_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['==', ['get', 'id'], '__none__'],
          layout: {
            'icon-image': ['concat', 'pin-', ['get', 'categoryId']],
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 1.25,
          },
        });
      } catch (error) {
        // Loud, not degraded: the basemap would still render, but without the
        // marker layers this is a map of nothing, and a silent version of that
        // is what cost a day.
        setMapError(error instanceof Error ? error.message : 'Could not build the map layers');
      } finally {
        setIsReady(true);
      }
    });

    const emitViewport = () => {
      const b = map.getBounds();
      const next: MapBounds = {
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      };
      setBounds(next);
      setCurrentZoom(map.getZoom());
      onViewportChange?.(next, map.getZoom());
    };

    /*
     * MapLibre measures its container once, in the constructor.
     *
     * The Explore map mounts into a container that appears in the same commit,
     * so that measurement can land on a 0x0 box — after which MapLibre holds a
     * 0x0 transform, decides no tile is visible, never fires `load`, and paints
     * nothing but the style's background colour. Every symptom of a broken map
     * with no error anywhere, because as far as it is concerned there is
     * nothing to draw.
     *
     * A ResizeObserver is the fix rather than a one-shot resize: it also covers
     * the sheet opening, the keyboard appearing, and orientation changes, none
     * of which fire `window.resize` reliably on mobile.
     */
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    map.on('load', emitViewport);
    map.on('moveend', emitViewport);

    mapRef.current = map;

    if (process.env.NODE_ENV !== 'production') {
      // Map bugs are almost always about style, source or layer state that no
      // React devtool can show. A handle in the console is the only practical
      // way to inspect them. Development only.
      (window as unknown as { __gonoplanMap?: MapLibreMap }).__gonoplanMap = map;
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      spritesLoadedRef.current = false;
    };
    // Mount-only: `center` and `zoom` are the *initial* camera. Re-running on
    // every prop change would yank the map back mid-gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sprite registration ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !categories || spritesLoadedRef.current) return;

    const pixelRatio = window.devicePixelRatio || 1;

    for (const category of flattenCategories(categories)) {
      const id = markerImageId(category.id);
      if (map.hasImage(id)) continue;

      const image = renderMarkerImage(
        { categoryId: category.id, iconKey: category.iconKey, colorHex: category.colorHex },
        pixelRatio,
      );
      if (image) map.addImage(id, image, { pixelRatio });
    }

    const clusters: Array<[string, number]> = [
      [CLUSTER_IMAGE_SMALL, 28],
      [CLUSTER_IMAGE_MEDIUM, 36],
      [CLUSTER_IMAGE_LARGE, 46],
    ];

    for (const [id, size] of clusters) {
      if (map.hasImage(id)) continue;
      const image = renderClusterImage(size, '#0F6CCD', pixelRatio);
      if (image) map.addImage(id, image, { pixelRatio });
    }

    spritesLoadedRef.current = true;
  }, [isReady, categories]);

  // ─── Marker data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const features = (markerPage?.markers ?? []).map((marker: PlaceMarker) => ({
      type: 'Feature' as const,
      id: marker.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [marker.longitude, marker.latitude],
      },
      properties: {
        id: marker.id,
        categoryId: marker.categoryId,
        priceRange: marker.priceRange,
        rating: marker.bayesianRating,
      },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [isReady, markerPage]);

  // ─── Interaction ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const onMarkerClick = (event: MapLayerMouseEvent) => {
      const placeId = event.features?.[0]?.properties?.['id'];
      if (typeof placeId === 'string') onSelectPlace?.(placeId);
    };

    const onClusterClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.['cluster_id'];
      if (typeof clusterId !== 'number') return;

      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      // Zooming to the cluster's own break-up zoom is what makes tapping a
      // bubble feel like it opened rather than merely moved.
      void source?.getClusterExpansionZoom(clusterId).then((expansionZoom) => {
        const geometry = feature?.geometry;
        if (geometry?.type !== 'Point') return;
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: expansionZoom,
          duration: 420,
        });
      });
    };

    const setPointer = (cursor: string) => () => {
      map.getCanvas().style.cursor = cursor;
    };

    map.on('click', MARKER_LAYER, onMarkerClick);
    map.on('click', MARKER_SELECTED_LAYER, onMarkerClick);
    map.on('click', CLUSTER_LAYER, onClusterClick);
    map.on('mouseenter', MARKER_LAYER, setPointer('pointer'));
    map.on('mouseleave', MARKER_LAYER, setPointer(''));
    map.on('mouseenter', CLUSTER_LAYER, setPointer('pointer'));
    map.on('mouseleave', CLUSTER_LAYER, setPointer(''));

    return () => {
      map.off('click', MARKER_LAYER, onMarkerClick);
      map.off('click', MARKER_SELECTED_LAYER, onMarkerClick);
      map.off('click', CLUSTER_LAYER, onClusterClick);
    };
  }, [isReady, onSelectPlace]);

  // ─── Selection ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    map.setFilter(MARKER_SELECTED_LAYER, ['==', ['get', 'id'], selectedPlaceId ?? '__none__']);
  }, [isReady, selectedPlaceId]);

  // ─── User location dot ────────────────────────────────────────────────────
  const userMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (!userMarkerRef.current) {
      // A single DOM marker is fine here — there is exactly one, and it needs a
      // CSS animation that a symbol layer cannot express.
      const element = document.createElement('div');
      element.className = 'gonoplan-user-dot';
      userMarkerRef.current = new Marker({ element }).setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
      userMarkerRef.current.addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    }
  }, [isReady, userLocation]);

  // ─── Imperative recentre ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const current = map.getCenter();
    const moved =
      Math.abs(current.lng - center.longitude) > 1e-4 ||
      Math.abs(current.lat - center.latitude) > 1e-4;

    // Guarded so a re-render with an unchanged centre does not interrupt a pan
    // the user is in the middle of.
    if (moved) {
      map.easeTo({ center: [center.longitude, center.latitude], duration: 700 });
    }
  }, [isReady, center.latitude, center.longitude]);

  const zoomBy = useCallback(
    (delta: number) => {
      mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom() ?? zoom) + delta, duration: 220 });
    },
    [zoom],
  );

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {/*
        `touch-none` hands every touch event to MapLibre. Without it the browser
        claims vertical drags for page scrolling and the map only pans
        horizontally — the single most common broken-feeling mobile map bug.
      */}
      <div ref={containerRef} className="h-full w-full touch-none" />

      {!isReady && !mapError && (
        <div className="from-primary-tint via-surface to-accent-tint absolute inset-0 animate-pulse bg-gradient-to-br" />
      )}

      {mapError && (
        <div className="bg-surface-sunken absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-ink text-sm font-semibold">Map unavailable</p>
          <p className="text-ink-muted max-w-[18rem] text-xs leading-relaxed">{mapError}</p>
        </div>
      )}

      {markerPage?.capped && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="bg-ink/75 rounded-full px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            Showing the top places — zoom in for more
          </span>
        </div>
      )}

      {showZoomControls && (
        /*
          The offset is the caller's to set, because only the caller knows what
          it floats over the map. Explore's full-map view puts a card carousel
          along the bottom, and at the old fixed `bottom-9` the two buttons sat
          squarely behind it — present in the tree, invisible, and impossible to
          tap. An inline style rather than a class: Tailwind cannot generate a
          utility from a value it only sees at runtime.
        */
        <div
          className="absolute right-3 flex flex-col gap-1.5"
          style={{ bottom: controlsBottomOffset }}
        >
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => {
              zoomBy(1);
            }}
            className="bg-surface/90 text-ink flex size-10 items-center justify-center rounded-sm text-lg font-medium shadow-md backdrop-blur-sm active:scale-95"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => {
              zoomBy(-1);
            }}
            className="bg-surface/90 text-ink flex size-10 items-center justify-center rounded-sm text-lg font-medium shadow-md backdrop-blur-sm active:scale-95"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
