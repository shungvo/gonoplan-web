import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Where the native app keeps its session between launches.
 *
 * The web app has no business here. Its session is an HttpOnly refresh cookie
 * that JavaScript cannot read, which is precisely why an XSS payload cannot
 * steal it — every function below returns early in a browser rather than
 * building a second, readable copy of the same session.
 *
 * The app shell has no such option. `capacitor://localhost` calling an API on
 * another origin is cross-site, so the cookie is never sent back and the
 * session ended at every launch. The token has to be held by the client, and
 * the only question is where.
 *
 * Not `@capacitor/preferences`, which is what was installed for this: on iOS it
 * writes UserDefaults — a plain plist inside the app container, unencrypted and
 * **included in device backups**. A refresh token is a long-lived credential;
 * putting one somewhere it can be read out of an unencrypted iTunes backup is
 * worse than the cookie it replaces.
 */
const KEY = 'refreshToken';

/**
 * `ThisDeviceOnly` is the half that matters: the item is excluded from backups
 * and never migrates to a restored device, which is the exact gap UserDefaults
 * left open.
 *
 * `afterFirstUnlock` rather than `whenUnlocked` because the app can be launched
 * or prewarmed by the system before the user has brought it to the foreground.
 * `whenUnlocked` would fail that read, and a failed read here is
 * indistinguishable from "no session" — the user would be signed out by an
 * event they never saw.
 */
const ACCESS = KeychainAccess.afterFirstUnlockThisDeviceOnly;

/**
 * True when this build keeps its own refresh token.
 *
 * Guarded on `window` because the static export prerenders every route in Node,
 * where there is no platform to ask about.
 */
export function usesStoredRefreshToken(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Read through a memory cache.
 *
 * Every 401 anywhere in the app funnels into one refresh, and each one would
 * otherwise cross the bridge to the Keychain first. The cache is authoritative
 * once populated because nothing else on the device writes this key.
 */
let cached: string | null | undefined;

let configured: Promise<void> | null = null;

function configureKeychain(): Promise<void> {
  configured ??= SecureStorage.setDefaultKeychainAccess(ACCESS);
  return configured;
}

export async function readStoredRefreshToken(): Promise<string | null> {
  if (!usesStoredRefreshToken()) return null;
  if (cached !== undefined) return cached;

  try {
    cached = await SecureStorage.getItem(KEY);
  } catch {
    // A Keychain that will not answer is a session that cannot be restored,
    // which is a sign-in prompt — not a crash on the first screen.
    cached = null;
  }

  return cached;
}

export async function storeRefreshToken(token: string | null): Promise<void> {
  if (!usesStoredRefreshToken()) return;

  // Set before awaiting: a rotation racing a read must never hand back the
  // token that was just retired, or the next refresh presents a dead one and
  // reuse detection revokes the whole family.
  cached = token;

  try {
    if (token === null) {
      await SecureStorage.remove(KEY);
      return;
    }

    await configureKeychain();
    await SecureStorage.setItem(KEY, token);
  } catch {
    // Nothing to tell the user. The session works for as long as the app is
    // open; it simply will not survive being closed.
  }
}
