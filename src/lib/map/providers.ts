import type { MapStyleProvider, MapStyleSource } from './types';

/**
 * Goong vector tiles.
 *
 * Uses the **maptiles** key, which is public by necessity — the browser fetches
 * tiles directly, so it is visible in devtools no matter what we do. Restrict it
 * by HTTP referrer in the Goong console. The separate REST key stays server-side
 * and is never referenced in this repo.
 */
class GoongStyleProvider implements MapStyleProvider {
  readonly name = 'goong';

  private readonly apiKey = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY ?? '';

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  getStyle(): MapStyleSource {
    return {
      styleUrl: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${this.apiKey}`,
      attribution: '© Goong',
      isFallback: false,
      providerName: 'Goong',
    };
  }
}

/**
 * Keyless development fallback.
 *
 * Without this, nobody can run the app — or review a UI change — until someone
 * has signed up for Goong and distributed a key. The provider abstraction is
 * what makes an alternative basemap a config branch rather than a rewrite, so
 * using it here is the abstraction earning its keep on day one.
 *
 * Development only: `resolveMapStyleProvider` refuses to fall back in
 * production, where a missing key is a deployment error that must be loud.
 */
class OpenFreeMapStyleProvider implements MapStyleProvider {
  readonly name = 'openfreemap';

  isConfigured(): boolean {
    return true;
  }

  getStyle(): MapStyleSource {
    return {
      styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
      attribution: '© OpenStreetMap contributors',
      isFallback: true,
      providerName: 'OpenFreeMap',
    };
  }
}

const goong = new GoongStyleProvider();
const fallback = new OpenFreeMapStyleProvider();

/**
 * Picks the basemap provider once, from configuration.
 *
 * Swapping Goong for another vendor is a new class and one line here — no
 * component changes, because nothing above this layer knows a vendor exists.
 */
export function resolveMapStyleProvider(): MapStyleProvider {
  if (goong.isConfigured()) return goong;

  if (process.env.NODE_ENV === 'production') {
    // Silently serving a different basemap in production would hide a
    // misconfigured deploy behind a map that merely looks slightly wrong.
    throw new Error(
      'NEXT_PUBLIC_GOONG_MAPTILES_KEY is not set. Refusing to fall back to the development basemap in production.',
    );
  }

  return fallback;
}
