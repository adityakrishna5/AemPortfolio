# Authentication & Authorization Implementation

## Architecture Overview

The browser **never calls Auth0 directly**. All authentication goes through an AEM OSGi proxy servlet. Tokens are stored exclusively in `HttpOnly` cookies — JavaScript cannot read them. CSRF protection uses an HMAC-signed double-submit pattern.

```
Browser ──POST /bin/adkstvite/auth/signup──▶ AEM Publish (OSGi Servlet)
                                                     │
                                          POST /dbconnections/signup
                                                     │
                                               Auth0 Tenant
                                                     │
                                          POST /oauth/token (auto-login)
                                                     │
                                    Set-Cookie: adv_access_token (HttpOnly)
                                    Set-Cookie: adv_refresh_token (HttpOnly)
Browser ◀──────────────────────────────────────────────────────────────────
```

---

## File Reference

### Backend (Java / OSGi)

#### `core/src/main/java/com/adkstvite/core/auth/Auth0Config.java`

OSGi metatype interface (`@ObjectClassDefinition`). Declares the five config properties consumed by the servlet:

| Property       | Description                                                                        |
| -------------- | ---------------------------------------------------------------------------------- |
| `domain`       | Auth0 tenant domain (no scheme)                                                    |
| `clientId`     | Auth0 application client ID                                                        |
| `clientSecret` | Auth0 client secret — `AttributeType.PASSWORD` so it's masked in the Felix console |
| `audience`     | Auth0 API audience identifier                                                      |
| `connection`   | Auth0 DB connection name (default `Username-Password-Authentication`)              |

---

#### `core/src/main/java/com/adkstvite/core/auth/Auth0ProxyServlet.java`

The central OSGi `SlingAllMethodsServlet`. Registers on six explicit paths:

| Method | Path                           | What it does                                                                                                  |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/bin/adkstvite/auth/csrf`     | Generates a fresh HMAC-signed CSRF token, sets `_csrf` cookie (non-HttpOnly), returns `{ csrfToken }` in body |
| `POST` | `/bin/adkstvite/auth/login`    | Password grant → `adv_access_token` + `adv_refresh_token` cookies                                             |
| `POST` | `/bin/adkstvite/auth/signup`   | Auth0 DB signup → auto-login → same cookies as login                                                          |
| `GET`  | `/bin/adkstvite/auth/userinfo` | Proxies `Authorization: Bearer <cookie>` to Auth0 `/userinfo`, returns user JSON                              |
| `POST` | `/bin/adkstvite/auth/refresh`  | Uses `adv_refresh_token` cookie to get a new access token                                                     |
| `POST` | `/bin/adkstvite/auth/logout`   | Clears all auth cookies (sets Max-Age=0)                                                                      |

**Security mechanisms inside the servlet:**

- **Cookie flags**: `HttpOnly`, `SameSite=Strict`, `Secure` (on HTTPS), `Path=/`
- **CSRF verification**: Every POST checks `X-CSRF-Token` header. Verification has two modes:
  1. **HMAC-signed** (primary): server re-computes `HMAC-SHA256(nonce, clientSecret)` and compares — no session state needed, survives Vite proxy hops that suppress cookies.
  2. **Double-submit cookie** (fallback): header value must equal the `_csrf` cookie value.
- **CSRF key**: derived from `Auth0Config.clientSecret`. Falls back to a random per-startup key in local dev when the secret is unresolved (`$[secret:...]`). Tokens are **invalidated on AEM restart** in that case.
- **Token expiry**: access token cookie `Max-Age=3600` (1 hour), refresh token `Max-Age=2592000` (30 days).

---

#### `core/src/main/java/com/adkstvite/core/auth/AuthRateLimitFilter.java`

Sling request-scope `Filter` applied at `SERVICE_RANKING=1000` (runs before the servlet).

- Applies a **sliding-window rate limit** of 10 POST attempts per 5 minutes per IP on `/login` and `/signup`.
- Returns HTTP `429` with `{ "error": "too many attempts..." }` when exceeded.
- Uses `X-Forwarded-For` to get the real client IP (CDN-aware).
- State is in-memory (`ConcurrentHashMap<IP, Deque<timestamp>>`); resets on AEM restart.

---

#### `core/src/main/java/com/adkstvite/core/models/travel/TravelHeaderModel.java`

Sling Model (`@Model`) adapted from `SlingHttpServletRequest`. Used by the HTL template to resolve auth state **server-side at render time**, eliminating the sign-in/signed-in flash on page load.

- Reads the `adv_access_token` cookie from the incoming request.
- Base64url-decodes the JWT **payload segment only** (no signature verification — the cookie is `HttpOnly` and was set by this same server).
- Extracts `exp` (expiry), `name`, `nickname`, `email` fields via substring scanning.
- Exposes `isAuthenticated()` (boolean) and `getDisplayName()` (String) to HTL.

---

### HTL Template

#### `ui.apps/src/main/content/jcr_root/apps/adkstvite/components/travel-header/travel-header.html`

Renders the React mount `<div>` with server-resolved values as `data-*` attributes:

```html
data-is-authenticated="${model.authenticated @ context='attribute'}"
data-display-name="${model.displayName @ context='attribute'}"
```

`context='attribute'` applies HTL attribute escaping, preventing XSS from the display name.

---

### Frontend (TypeScript / React)

#### `ui.frontend/src/main/webpack/components/travel/auth/authService.ts`

All fetch calls to the auth endpoints. Never imported outside the `auth/` folder directly.

**Exports:**

| Export                                         | Description                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `login(email, password)`                       | Clears user cache → POST `/login` → returns `AuthResult`              |
| `signup(email, password, firstName, lastName)` | Clears user cache → POST `/signup` → returns `AuthResult`             |
| `logout()`                                     | POST `/logout` → clears user + sessionStorage cache                   |
| `getUserInfo()`                                | GET `/userinfo` with sessionStorage + in-memory promise deduplication |
| `refreshToken()`                               | POST `/refresh` → returns boolean success                             |
| `clearUserCache()`                             | Clears in-memory promise + sessionStorage entry                       |

**Internal CSRF flow (`ensureCsrfToken`):**

1. Return `_csrfTokenCache` if set (fastest path).
2. Read `_csrf` cookie and cache it.
3. Fetch `GET /csrf`, parse `csrfToken` from response body, cache it.
4. Throw if fetch fails (prevents silent 403s from reaching the server).

**User info caching strategy:**

- `sessionStorage` key `adv_user_cache` — survives page navigations within the tab, cleared when tab closes.
- In-memory promise deduplication — if multiple components call `getUserInfo()` simultaneously on the same page load, only one network request fires.

---

#### `ui.frontend/src/main/webpack/components/travel/auth/useAuth.ts`

React hook wrapping `getUserInfo()` + silent refresh:

1. Calls `getUserInfo()`.
2. On `null` (expired/missing access token), calls `refreshToken()` then retries `getUserInfo()` once.
3. Returns `{ user, isAuthenticated, isLoading }`.

Used by components that need reactive auth state (e.g. `AccountPage`).

---

#### `ui.frontend/src/main/webpack/components/travel/TravelHeader.tsx`

React component for the site header. Receives server-resolved props from `data-*` attributes.

**Auth state strategy:**

- Initialises `isAuthenticated` from `isAuthenticatedInitial` (server-baked — no flash).
- On mount, if `isAuthenticatedInitial=false`, calls `getUserInfo()` to correct stale cached HTML (handles Dispatcher-cached pages served after login).
- `handleSignOut` calls `logout()` then redirects to home.

---

#### `ui.frontend/src/main/webpack/components/travel/SignInForm.tsx`

Login form. On submit: calls `login()` → redirects to `/account.html` on success, shows API error on failure.

---

#### `ui.frontend/src/main/webpack/components/travel/RegisterForm.tsx`

Registration form. On submit: calls `signup()` → redirects to `/account.html` if `autoSignedIn=true`, shows success screen (with "Sign In" link) if auto-login failed, shows API error on registration failure.

---

#### `ui.frontend/src/main/webpack/components/travel/mount.tsx`

Reads `data-*` attributes from each component's DOM mount point and renders the correct React component via `createRoot`. The `TravelHeader` mount reads `data-is-authenticated` and `data-display-name` to pass as initial props.

---

### OSGi Configurations (`ui.config`)

#### `config/com.adkstvite.core.auth.Auth0ProxyServlet.cfg.json`

Base config (all run modes). Contains domain, clientId, audience, connection. `clientSecret` uses `$[secret:AUTH0_CLIENT_SECRET]` — resolved from AEM's secret store in production.

#### `config.author/com.adkstvite.core.auth.Auth0ProxyServlet.cfg.json`

Author-specific override. Has the plaintext client secret for local author development.

#### `config.publish/com.adkstvite.core.auth.Auth0ProxyServlet.cfg.json`

Publish-specific override. Has the plaintext client secret for local publish development.

> **Note**: Plaintext secrets in `config.author` / `config.publish` are acceptable for local dev only. In production (AEMaaCS), use `$[secret:AUTH0_CLIENT_SECRET]` and configure the secret via Cloud Manager environment variables.

---

#### `config/com.adobe.granite.csrf.impl.CSRFFilter.cfg.json`

Excludes the auth servlet paths from AEM's **built-in** Granite CSRF filter (which would otherwise block all POSTs before the servlet runs). Each subpath must be listed **explicitly** — the Granite filter uses exact-match, not prefix-match.

```json
"/bin/adkstvite/auth/login",
"/bin/adkstvite/auth/signup",
"/bin/adkstvite/auth/logout",
"/bin/adkstvite/auth/userinfo",
"/bin/adkstvite/auth/refresh",
"/bin/adkstvite/auth/csrf"
```

---

#### `config.author/com.adobe.granite.cors.impl.CORSPolicyImpl~adkstvite.cfg.json`

CORS policy for the author instance (used during Vite dev → author proxy). Allows `localhost:3000` and includes:

- All six auth paths in `allowedpaths`
- `X-CSRF-Token` in `supportedheaders`
- `POST` in `supportedmethods`
- `allowcredentials: true` (required for cookie-based auth across origins)

---

### Vite Dev Server Proxy

#### `ui.frontend/vite.config.ts`

During `vite dev`, proxies all `/bin/adkstvite/*` requests to `http://localhost:4503` (publish):

```ts
'/bin/adkstvite': {
  target: 'http://localhost:4503',
  changeOrigin: true,
  secure: false,
}
```

This means auth calls from the browser on `localhost:3000` transparently hit the AEM publish instance. The CORS policy is not needed for the proxy path (same origin from the servlet's perspective via `changeOrigin`), but is required for direct browser-to-AEM calls.

---

## Request Flow: Signup

```
1. Browser loads /register page
   → AEM Publish renders RegisterForm with no auth data-* attrs
   → React mounts RegisterForm

2. User submits form
   → ensureCsrfToken(): fetches GET /bin/adkstvite/auth/csrf
   → AuthRateLimitFilter: checks IP rate limit (pass)
   → CSRFFilter: path excluded, passes through
   → Auth0ProxyServlet.doGet("/csrf"): generates HMAC token, sets _csrf cookie, returns { csrfToken }

3. POST /bin/adkstvite/auth/signup with X-CSRF-Token header
   → AuthRateLimitFilter: checks rate limit (pass)
   → CSRFFilter: path excluded, passes through
   → Auth0ProxyServlet.doPost: verifyCsrf() → HMAC verified ✓
   → POST https://auth0.com/dbconnections/signup
   → POST https://auth0.com/oauth/token (auto-login password grant)
   → Set-Cookie: adv_access_token (HttpOnly), adv_refresh_token (HttpOnly)
   → Returns { status:"ok", autoSignedIn:true }

4. RegisterForm redirects to /account.html
   → AEM Publish renders page (Sling Model reads adv_access_token cookie)
   → TravelHeaderModel decodes JWT → isAuthenticated=true, displayName="John"
   → HTL bakes data-is-authenticated="true" data-display-name="John" into HTML
   → React mounts TravelHeader with correct state — no flash
```

## Request Flow: Page Load (Cached HTML)

```
1. AEM Dispatcher serves cached HTML with data-is-authenticated="false"
2. React mounts TravelHeader with isAuthenticatedInitial=false
3. useEffect fires: getUserInfo()
   → sessionStorage hit? → return cached user instantly
   → or: GET /bin/adkstvite/auth/userinfo → Auth0 /userinfo → cache → return user
4. setIsAuthenticated(true), setDisplayName("John")
   → Header re-renders showing user name + Sign Out button
```
