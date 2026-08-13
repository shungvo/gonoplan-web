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
 * OpenStreetMap vector tiles. No account, no key, no quota.
 *
 * This does two jobs, and it is worth being clear that they are different.
 *
 * It is the development basemap: without it nobody can run the app — or review
 * a UI change — until someone has signed up for Goong and distributed a key.
 *
 * It is also a basemap a build may choose outright, which is what
 * `NEXT_PUBLIC_MAP_PROVIDER=openfreemap` says. The iOS bundle ships that way,
 * because a native build has no domain to restrict a maptiles key to: the
 * referrer restriction that protects the web key does not exist for a WebView,
 * so shipping a key inside an `.ipa` is handing out an unrestricted one.
 *
 * The public instance is donation-funded and asks heavy users to run their own;
 * if that day comes, `styleUrl` is the only line that changes. Attribution is
 * required rather than decorative — OpenStreetMap's licence is the reason this
 * is free.
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

const PROVIDER_NAMES = ['goong', 'openfreemap'] as const;

type MapProviderName = (typeof PROVIDER_NAMES)[number];

const PROVIDERS: Record<MapProviderName, MapStyleProvider> = {
  goong: new GoongStyleProvider(),
  openfreemap: new OpenFreeMapStyleProvider(),
};

/** Narrows the env string to a provider name, or nothing. No cast. */
function toProviderName(value: string): MapProviderName | null {
  return PROVIDER_NAMES.find((name) => name === value) ?? null;
}

/**
 * Picks the basemap provider once, from configuration.
 *
 * Swapping Goong for another vendor is a new class and one line in `PROVIDERS`
 * — no component changes, because nothing above this layer knows a vendor
 * exists.
 *
 * Two ways in, and the order matters:
 *
 * `NEXT_PUBLIC_MAP_PROVIDER` names the basemap outright and is obeyed in every
 * environment. Anything it names but cannot deliver throws, including Goong
 * without a key — an explicit choice that silently degrades is worse than one
 * that fails at boot.
 *
 * Unset, the old behaviour stands: Goong when keyed, the keyless basemap in
 * development, and a hard failure in production. That last branch used to be
 * the whole rule, and it was asking the wrong question — `NODE_ENV` describes
 * how the bundle was built, not whether anyone bought a map account. Every
 * release build is `production`, so the native build could not run keyless at
 * all, which is a deployment decision being made by a compiler flag. The env
 * var moves that decision back to whoever is deploying, and keeps the loud
 * failure for the case it was written for: a web deploy that *meant* to have a
 * key and forgot one.
 */
export function resolveMapStyleProvider(): MapStyleProvider {
  const requested = process.env.NEXT_PUBLIC_MAP_PROVIDER ?? '';

  if (requested.length > 0) {
    const name = toProviderName(requested);

    if (!name) {
      throw new Error(
        `NEXT_PUBLIC_MAP_PROVIDER is "${requested}", which is not a basemap this build knows. Valid values: ${PROVIDER_NAMES.join(', ')}.`,
      );
    }

    const chosen = PROVIDERS[name];

    if (!chosen.isConfigured()) {
      throw new Error(
        `NEXT_PUBLIC_MAP_PROVIDER asks for "${name}", but it is not configured. Set NEXT_PUBLIC_GOONG_MAPTILES_KEY, or choose a keyless basemap.`,
      );
    }

    return chosen;
  }

  if (PROVIDERS.goong.isConfigured()) return PROVIDERS.goong;

  if (process.env.NODE_ENV === 'production') {
    // Silently serving a different basemap in production would hide a
    // misconfigured deploy behind a map that merely looks slightly wrong.
    throw new Error(
      'NEXT_PUBLIC_GOONG_MAPTILES_KEY is not set. Set it, or set NEXT_PUBLIC_MAP_PROVIDER=openfreemap to choose the keyless basemap deliberately.',
    );
  }

  return PROVIDERS.openfreemap;
}
