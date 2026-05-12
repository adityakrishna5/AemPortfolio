/**
 * authService.ts
 *
 * All auth HTTP calls go through AEM's OSGi proxy servlet at /bin/adkstvite/auth/*.
 * The browser never calls Auth0 directly.
 *
 * Security model:
 *  - JWT access token: HttpOnly cookie (adv_access_token) — JS cannot read/tamper
 *  - Refresh token:    HttpOnly cookie (adv_refresh_token) — silent re-auth on expiry
 *  - CSRF protection:  double-submit cookie pattern
 *      Server issues _csrf (non-HttpOnly) cookie on any GET to auth endpoints.
 *      All state-changing POSTs must include X-CSRF-Token header == _csrf cookie value.
 */

const BASE = '/bin/adkstvite/auth';

export interface AuthUser {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
}

export interface AuthResult {
  status?: string;
  error?: string;
  autoSignedIn?: boolean;
}

// ── CSRF helpers ─────────────────────────────────────────────────────────────

/**
 * In-memory cache for the HMAC-signed CSRF token returned by GET /csrf.
 * Survives across multiple fetch calls within the same page lifecycle.
 * Reset on page unload (module reload) automatically.
 */
let _csrfTokenCache: string | null = null;

/** Reads the _csrf cookie value set by the server (non-HttpOnly, JS-readable). */
function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns a valid CSRF token, preferring the in-memory signed token.
 *
 * Priority:
 *  1. In-memory cache (HMAC-signed token from GET /csrf response body) — works
 *     even when the browser suppresses the _csrf cookie (e.g. Vite dev proxy).
 *  2. _csrf cookie — legacy double-submit path.
 *  3. Fetch GET /csrf, parse the signed token from the response body, cache it.
 */
async function ensureCsrfToken(): Promise<string> {
  if (_csrfTokenCache) return _csrfTokenCache;

  const fromCookie = getCsrfCookie();
  if (fromCookie) {
    _csrfTokenCache = fromCookie;
    return fromCookie;
  }

  // Neither cache nor cookie — fetch a signed token from the server.
  const res = await fetch(BASE + '/csrf', { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    throw new Error(`CSRF fetch failed: ${res.status}`);
  }
  const data = await res.json() as { status?: string; csrfToken?: string };
  if (!data.csrfToken) {
    throw new Error('CSRF response missing csrfToken');
  }
  _csrfTokenCache = data.csrfToken;
  return data.csrfToken;
}

// ── Internal fetch wrapper ───────────────────────────────────────────────────

async function postJson(path: string, body: object): Promise<Response> {
  const csrf = await ensureCsrfToken();
  return fetch(BASE + path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify(body),
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Exchange email + password for HttpOnly access-token + refresh-token cookies.
 * Returns { status:'ok' } on success or { error:'...' } on failure.
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  clearUserCache();
  const res = await postJson('/login', { email, password });
  const result = await res.json() as AuthResult;
  if (result.error) {
    // Login failed — restore nothing, but ensure cache stays clear
    clearUserCache();
  }
  return result;
}

/**
 * Create a new account via Auth0 DB connection then auto-login.
 * Returns { status:'ok' } on success or { error:'...' } on failure.
 */
export async function signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthResult> {
  clearUserCache();
  const res = await postJson('/signup', { email, password, firstName, lastName });
  return res.json() as Promise<AuthResult>;
}

/**
 * Clears all auth cookies server-side so the session ends.
 */
export async function logout(): Promise<void> {
  const csrf = await ensureCsrfToken();
  await fetch(BASE + '/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrf },
  });
  clearUserCache();
}

// ── getUserInfo cache ────────────────────────────────────────────────────────

const USER_CACHE_KEY = 'adv_user_cache';
/** In-memory promise cache — shared across all useAuth() callers on the same page load. */
let _userInfoPromise: Promise<AuthUser | null> | null = null;

/** Write user to sessionStorage so navigating between pages avoids a round-trip. */
function setCachedUser(user: AuthUser | null): void {
  try {
    if (user) sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_CACHE_KEY);
  } catch { /* private browsing / storage full */ }
}

/** Read user from sessionStorage (survives page nav, cleared when tab closes). */
function getCachedUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch { return null; }
}

/** Call after logout so the next getUserInfo() goes to the network. */
export function clearUserCache(): void {
  _userInfoPromise = null;
  setCachedUser(null);
}

/**
 * Fetches the current user's profile from Auth0 /userinfo using the stored cookie.
 * - First call per page: returns sessionStorage hit instantly (no network).
 * - Multiple components calling simultaneously: share the same in-flight promise.
 * - Returns null when unauthenticated or on any error.
 */
export async function getUserInfo(): Promise<AuthUser | null> {
  // 1. sessionStorage hit — instant, no network call
  const cached = getCachedUser();
  if (cached) return cached;

  // 2. Deduplicate concurrent calls (e.g. TravelHeader + AccountPage mounting together)
  if (_userInfoPromise) return _userInfoPromise;

  _userInfoPromise = fetch(BASE + '/userinfo', {
    method: 'GET',
    credentials: 'include',
  }).then(async (res) => {
    if (res.status === 401 || res.status === 403 || !res.ok) {
      _userInfoPromise = null; // don't cache failures
      return null;
    }
    const user = await res.json() as AuthUser;
    setCachedUser(user);
    return user;
  }).catch(() => {
    _userInfoPromise = null;
    return null;
  });

  return _userInfoPromise;
}

/**
 * Attempts a silent token refresh using the HttpOnly refresh-token cookie.
 * Returns true if a new access token was issued, false otherwise.
 */
export async function refreshToken(): Promise<boolean> {
  const csrf = await ensureCsrfToken();
  const res = await fetch(BASE + '/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrf },
  });
  if (!res.ok) clearUserCache();
  return res.ok;
}

