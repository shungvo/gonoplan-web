import { ApiError, type ApiErrorBody } from './errors';

export const API_PREFIX = '/api/v1';

/**
 * On the server (RSC, route handlers) there is no same-origin proxy to ride,
 * so requests go straight to the API. In the browser the path stays relative,
 * which is the entire point of the rewrite proxy — see next.config.ts.
 */
const SERVER_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const isServer = typeof window === 'undefined';

interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  cursor?: string | null;
  hasMore?: boolean;
  total?: number;
}

export interface ApiResult<T> {
  data: T;
  meta: ResponseMeta | undefined;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * How this request treats the session.
   *
   * `true` (default) — a signed-in caller is required in practice; a failed
   * refresh surfaces as an error, which is correct for `/plans` or `/auth/me`.
   *
   * `false` — never send the token. For endpoints where it would be ignored,
   * or where sending it is wrong (`/auth/login`).
   *
   * `'optional'` — send it when we have one, but never fail the read over it.
   * This is what public reads that are *personalised* need: `/places` returns
   * `isSaved` per viewer, so it has to carry the token, and an expired session
   * must degrade the discovery screen to anonymous results rather than to an
   * error. These were marked `false`, and the cost was silent: every card came
   * back unsaved and every search was recorded against no account.
   */
  withAuth?: boolean | 'optional';
}

/* ─── Access token: memory only ─────────────────────────────────────────────
 *
 * Never localStorage. Any XSS on the page can read localStorage; it cannot
 * read a module closure. The refresh cookie is HttpOnly, so a page reload
 * silently re-authenticates and the UX cost of this is zero.
 * See docs/02-api.md §2.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/* ─── Refresh coordination ─────────────────────────────────────────────────
 *
 * The home screen fires several requests at once. Without this, an expired
 * token means every one of them independently calls /auth/refresh — and since
 * refresh tokens rotate with reuse detection, the second call presents an
 * already-rotated token, the server reads that as theft, and it revokes the
 * whole family. The user gets logged out for loading the page.
 *
 * So: exactly one refresh in flight; everyone else awaits the same promise.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setAccessToken(null);
        return false;
      }
      const body = (await response.json()) as SuccessBody<{ accessToken: string }>;
      setAccessToken(body.data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = isServer ? `${SERVER_BASE}${API_PREFIX}` : API_PREFIX;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.error.code, body.error.message, {
      ...(body.error.details ? { details: body.error.details } : {}),
      requestId: body.error.requestId,
    });
  } catch {
    // A non-JSON error body means something upstream of the API failed —
    // the proxy, the edge, or a cold start returning HTML.
    return new ApiError(response.status, 'INTERNAL_ERROR', `Request failed (${response.status})`);
  }
}

async function execute<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, withAuth = true, headers, ...rest } = options;

  const sendsToken = withAuth !== false;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  if (sendsToken && accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      headers: requestHeaders,
      // Carries the HttpOnly refresh cookie. Same-origin thanks to the proxy.
      credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    throw ApiError.network(cause);
  }

  if (!response.ok) {
    const error = await parseError(response);

    // Refresh once, then replay. `isRetry` stops an expired-refresh loop.
    if (error.isAuthExpired && sendsToken && !isRetry && !isServer) {
      const refreshed = await refreshAccessToken();
      // A failed refresh has already cleared the token, so replaying an
      // optional-auth read sends nothing and comes back anonymous — which is
      // the whole point of that mode. Anything else surfaces the 401.
      if (refreshed || withAuth === 'optional') return execute<T>(path, options, true);
    }
    throw error;
  }

  if (response.status === 204) {
    return { data: undefined as T, meta: undefined };
  }

  const payload = (await response.json()) as SuccessBody<T>;
  return { data: payload.data, meta: payload.meta };
}

/**
 * Typed API client.
 *
 * `T` comes from `src/types/api.d.ts`, generated from the API's `openapi.json`
 * — response shapes are derived from the server contract, never hand-declared.
 * See docs/00-architecture.md §6.1.
 */
export const api = {
  request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    return execute<T>(path, options, false);
  },

  async get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const result = await execute<T>(path, { ...options, method: 'GET' }, false);
    return result.data;
  },

  /** Use when the response envelope's `meta` matters — paginated lists. */
  getWithMeta<T>(
    path: string,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResult<T>> {
    return execute<T>(path, { ...options, method: 'GET' }, false);
  },

  async post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const result = await execute<T>(path, { ...options, method: 'POST', body }, false);
    return result.data;
  },

  async patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const result = await execute<T>(path, { ...options, method: 'PATCH', body }, false);
    return result.data;
  },

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const result = await execute<T>(path, { ...options, method: 'DELETE' }, false);
    return result.data;
  },
};
