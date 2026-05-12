# Auth0 + AEM Architecture Discussion Notes

## Phase A — XF Localization Refactor

### What changed

- Deleted custom `xfLocalizer.js` + `experiencefragment.html` override
- Component now purely inherits `core/wcm/components/experiencefragment/v2/experiencefragment`
- Converted `fr`, `fr/fr`, `es`, `es/es` locale roots from `nt:folder` → `cq:Page` with `jcr:language`
- Core XF v2 `LanguageManager` auto-resolves correct locale XF based on page's language root
- Bootstrap script: `scripts/setup-language-roots.sh` (idempotent)

### Why this is industry standard

- No custom component code in the render path
- `cq:xfLocalizationId` + MSM Language Copies = Adobe's documented pattern
- Language roots marked with `jcr:language` so LanguageManager can discover them

---

## Phase B — Auth0 Authentication Strategy

### Auth0 Application Type: SPA (Single Page Application)

- Must be SPA, not Regular Web App
- SPA = public client, no `client_secret` required
- Allows CORS from browser origins
- Supports Resource Owner Password Grant (API-only, no redirect to Auth0 hosted login)

### Why Resource Owner Password Grant (no redirect)

- User requirement: "no redirection to Auth0 pages, API only"
- Auth0 SPA SDK and React SDK default to redirect flow (Authorization Code + PKCE)
- For no-redirect login, direct `fetch()` to `/oauth/token` is the correct approach
- Mobile apps, CLIs, embedded logins all use this pattern

### Auth0 Dashboard Setup

1. **Application** → SPA type → Allowed Origins: `http://localhost:4502, http://localhost:4503`
2. **Advanced Settings → Grant Types** → enable Password + Refresh Token
3. **Tenant Settings → General → Default Directory** = `Username-Password-Authentication`
   - Required for password grant to know which DB to authenticate against
4. **Create API** → Identifier: `https://adkstvite.api` → Signing: RS256
5. **API Settings** → Enable RBAC + Add Permissions in Access Token
6. **Authentication → Database → Username-Password-Authentication → Applications** → toggle ON for `AdventureTrails AEM`

### Credentials collected

```
Domain:     dev-raxs6tqu8i751qyo.us.auth0.com
Client ID:  Iaq7v390UyUDKxPSX1wwSVEVtFyps0Kk
Audience:   https://adkstvite.api
Connection: Username-Password-Authentication
```

---

## API Audience — What it is and why it matters

### What `https://adkstvite.api` actually is

- NOT a real URL — never fetched, pinged, or resolved
- Just a unique string identifier for "which API a token is meant for"
- Could be `urn:adkstvite:api` or anything unique
- Convention is `https://` format to avoid collisions

### Purpose

- Auth0 stamps `aud: "https://adkstvite.api"` inside every issued JWT
- Spring Boot validates `aud` matches its configured audience
- Prevents token issued for one API being used on another API
- Multi-service security: different audience per service = different "keys"

### Changing it later

- Auth0 does NOT allow renaming an existing API Identifier (immutable)
- Create a new API with new identifier when migrating to production domain
- Update 3 places: `authService.ts`, Spring Boot `application.yml`, any env config
- Users must re-login once (tokens with old audience become invalid)

---

## Where to Store Credentials

### Public values (safe to bundle in browser JS)

- `domain` — visible in every network request anyway
- `clientId` — designed to be public for SPA public clients (like a username)
- `audience` — just an identifier string
- `connection` — just a DB connection name

### Why no `client_secret` for SPA

- SPA = public client in OAuth 2.0
- Browser JS is visible to everyone → secrets cannot be stored safely
- Auth0 SPA app type does not require `client_secret` for password grant
- If you see a `client_secret` on your Auth0 app → wrong app type (Regular Web App)

### Storage options ranked

1. **Static TS config file** — simplest, works immediately, safe to commit
2. **Environment-aware TS file** — dev/prod switch in one file, no build changes needed
3. **Webpack env vars + `.env` files** — industry standard for CI/CD, prod values out of git

### OSGi config (AEM-specific, recommended for enterprise)

- Config lives in `ui.config/com.adkstvite.auth.Auth0Config.cfg.json`
- Sling run-modes: `config.dev/`, `config.prod/`, `config.stage/` — values differ per environment
- Change values in AEM without webpack rebuild
- Server-side secret storage available when needed (Granite Crypto)
- Standard AEM pattern for external service integrations (same as Salesforce, Adobe Analytics, SAP)

---

## React vs Fetch vs Auth0 SDKs

### Your stack

- HTL renders a mount point with `data-*` attributes (server-side)
- `mount.tsx` detects component IDs, calls `createRoot(el).render(<Component .../>)`
- React components handle state + interactivity
- This is "React islands in AEM" — a legitimate hybrid pattern

### Auth0 SDK comparison

| SDK                                | Works for your case? | Why                                                         |
| ---------------------------------- | -------------------- | ----------------------------------------------------------- |
| `@auth0/auth0-react`               | ❌                   | Requires React app structure, defaults to redirect flow     |
| `@auth0/auth0-spa-js`              | ❌                   | Password grant not officially supported, wraps fetch anyway |
| `auth0-js` (legacy)                | ⚠️                   | Supports password grant, but marked legacy by Auth0         |
| **Direct `fetch()` to Auth0 REST** | ✅                   | Exactly what SDKs do internally, most transparent           |

### Architecture decision

- `authService.ts` — pure TS + fetch, zero React dependency, portable
- `useAuth.ts` — React hook wrapping `authService`, triggers re-renders
- Components stay clean: `const { user, login, logout } = useAuth()`

---

## Backend Strategy

### Three backends in play

| Backend     | Role                                     | Who builds it                 |
| ----------- | ---------------------------------------- | ----------------------------- |
| Auth0       | Identity provider (issues tokens)        | You configure, Auth0 operates |
| AEM         | Content delivery (serves HTML/JS/CSS)    | Already built                 |
| Spring Boot | Business API (bookings, user data, etc.) | You build (Phase C)           |

### Why NOT OSGi for auth logic (as primary backend)

- Adds complexity — AEM doesn't need to know about Auth0 users
- Would duplicate auth logic in AEM and Spring Boot
- CMS should be decoupled from identity/business logic
- AEM Sling Servlets are for content operations, not API business logic

### Full OSGi Proxy (enterprise pattern)

Browser never calls Auth0 directly. AEM acts as proxy:

```
Browser → POST /bin/adkstvite/auth/login → AEM Servlet → Auth0
                                                       ↓ JWT
                        HttpOnly Cookie ← AEM Servlet
```

Benefits:

- Auth0 domain never appears in browser DevTools Network tab
- Credentials managed in OSGi (rotatable without redeploy)
- CSP can block all external origins
- Server-side secret storage for Management API calls
- Per-environment config via Sling run-modes
- Centralized logging + audit trail

---

## JWT vs Cookie vs Bearer Token

### JWT is the FORMAT. Cookie is the TRANSPORT.

```
JWT = the letter (content: who you are, what you can do, when token expires)
Cookie = the envelope (how the letter travels and gets stored)
```

### Same JWT, three transports

```
Option A: JWT inside HttpOnly cookie  → Cookie: adv_access_token=eyJ...
Option B: JWT in Authorization header → Authorization: Bearer eyJ...
Option C: JWT in sessionStorage       → sessionStorage.getItem('access_token')
```

### Two Auth0 tokens

| Token           | Format        | Purpose                                    | Storage                   |
| --------------- | ------------- | ------------------------------------------ | ------------------------- |
| `access_token`  | JWT           | Proves identity to APIs                    | HttpOnly cookie           |
| `id_token`      | JWT           | User profile (name, email, picture) for UI | Returned as JSON to React |
| `refresh_token` | Opaque string | Gets new access_token when expired         | HttpOnly cookie           |

### Token storage security comparison

| Storage               | XSS safe?        | CSRF safe?              | Works in non-browser? |
| --------------------- | ---------------- | ----------------------- | --------------------- |
| HttpOnly Cookie       | ✅ JS can't read | ⚠️ Need SameSite=Strict | ❌ Browser only       |
| sessionStorage        | ❌               | ✅                      | ❌                    |
| localStorage          | ❌               | ✅                      | ❌                    |
| iOS Keychain          | ✅               | ✅                      | ✅ (mobile only)      |
| Android Keystore      | ✅               | ✅                      | ✅ (mobile only)      |
| Env variable (server) | ✅               | ✅                      | ✅ (server only)      |

### When to use which transport

| Client type                  | Transport                                          |
| ---------------------------- | -------------------------------------------------- |
| Browser web app (AEM)        | HttpOnly Cookie                                    |
| iOS / Android mobile         | Bearer from Keychain/Keystore                      |
| CLI / scripts                | Bearer from env variable                           |
| Microservice → microservice  | Bearer (M2M client credentials grant)              |
| API serving all of the above | Support BOTH (check header first, cookie fallback) |

### Why tutorials show Bearer headers

- Universal — works for ALL client types
- Easy to test in Postman/curl
- Doesn't require cookie setup
- Tutorial authors pick the simplest example → everyone thinks it's the only way

---

## RS256 vs HS256

### RS256 is the industry standard

|                    | RS256                                | HS256                                |
| ------------------ | ------------------------------------ | ------------------------------------ |
| Type               | Asymmetric (2 keys)                  | Symmetric (1 key)                    |
| Signs with         | Auth0 **private key**                | Shared secret                        |
| Verifies with      | Auth0 **public key** (anyone)        | Same shared secret                   |
| Key rotation       | Automatic (JWKS)                     | Manual (update every service)        |
| Multiple services  | ✅ Each service uses public key      | ❌ Each service needs copy of secret |
| Service compromise | Cannot forge tokens — no private key | Can forge tokens — has shared secret |

### Why RS256 wins for multi-service

- Spring Boot, mobile app, partner API — all verify with the same public JWKS endpoint
- No secret sharing required
- Compromising Spring Boot cannot create fake tokens
- Auth0 rotates signing keys automatically; Spring Boot picks up new public key from JWKS

### Auth0's own recommendation

> "RS256 is the recommended algorithm for signing JWTs for APIs. It is more secure than HS256 because the private key used to sign tokens is kept secret by the authorization server."

### When HS256 is acceptable

- Internal service-to-service where you own BOTH ends
- Never exposed externally
- Small teams, fully trusted environment

---

## Stateless vs Stateful APIs

### JWT cookie = stateless

- Cookie transport ≠ stateful
- Traditional session cookie (JSESSIONID) = stateful — server stores session data
- JWT cookie = stateless — all state is INSIDE the signed token
- Spring Boot reads claims directly from JWT — no session store lookup

### How Spring Security intercepts the cookie

```
Request arrives with Cookie: adv_access_token=eyJ...
    │
    ▼
BearerTokenAuthenticationFilter
    │
    ├── CustomCookieBearerTokenResolver.resolve(request)
    │     └── reads cookie → returns raw JWT string
    │
    ├── JwtDecoder.decode(jwtString)
    │     ├── fetches JWKS from Auth0 (cached after first call)
    │     ├── verifies RS256 signature
    │     ├── checks aud == "https://adkstvite.api"
    │     ├── checks iss == "https://dev-raxs...auth0.com/"
    │     └── checks exp > now
    │
    ├── ALL VALID → populate SecurityContext
    └── ANY INVALID → 401 (controller never runs)
    │
    ▼
Your controller runs with @AuthenticationPrincipal Jwt jwt
    └── jwt.getSubject() = "auth0|64f3abc"
```

### JWKS caching — Auth0 NOT called per request

- First request: fetch public keys from Auth0 JWKS endpoint → cache in memory
- Subsequent requests: validate locally in memory (microseconds, no network call)
- Keys are rotated by Auth0 periodically; Spring picks up new keys automatically

### Token revocation tradeoff

- Pure stateless JWT: valid until `exp` even after logout
- Mitigations:
  - Short-lived access tokens (15-60 min) + refresh token rotation
  - Auth0 Management API token revocation (partially stateful)
  - Redis blocklist of revoked JTI claims (enterprise pattern)

---

## Secured Page Pattern in React

### The key line

```ts
credentials: "include"; // tells fetch() to send cookies automatically
```

### Generic secured fetch wrapper

```ts
export async function securedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (res.status === 401) {
    window.location.href = `/sign-in.html?return=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Unauthorized");
  }
  return res;
}
```

### useAuth hook pattern

```ts
export function useAuth(): AuthState {
  const [state, setState] = useState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  useEffect(() => {
    fetch("/bin/adkstvite/auth/userinfo", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((user) =>
        setState({ user, isAuthenticated: true, isLoading: false }),
      )
      .catch(() =>
        setState({ user: null, isAuthenticated: false, isLoading: false }),
      );
  }, []);
  return state;
}
```

### Secured page guard

```tsx
const { user, isAuthenticated, isLoading } = useAuth();
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    window.location.href = "/sign-in.html";
  }
}, [isLoading, isAuthenticated]);
```

---

## Planned Implementation — Phase B

### Files to create

```
core/src/main/java/com/adkstvite/core/auth/
├── Auth0Config.java              OSGi service (reads cfg.json)
└── Auth0ProxyServlet.java        Sling servlet at /bin/adkstvite/auth/*
    ├── POST /login               → Auth0 /oauth/token → set HttpOnly cookie
    ├── POST /signup              → Auth0 /dbconnections/signup → auto-login
    ├── POST /refresh             → Auth0 /oauth/token (refresh_token grant)
    ├── GET  /userinfo            → Auth0 /userinfo (using cookie token)
    └── POST /logout              → clear HttpOnly cookies

ui.config/apps/adkstvite/osgiconfig/
├── config.dev/com.adkstvite.auth.Auth0Config.cfg.json   dev tenant values
└── config.prod/com.adkstvite.auth.Auth0Config.cfg.json  prod tenant values (placeholder)

ui.frontend/src/main/webpack/
├── auth/
│   ├── authService.ts            login/signup/logout — calls /bin/adkstvite/auth/*
│   ├── securedFetch.ts           fetch wrapper with 401 redirect
│   └── authEvents.ts             'auth:changed' event bus
├── hooks/
│   └── useAuth.ts                React hook wrapping authService
└── components/travel/
    ├── SignInForm.tsx             wire handleSubmit → authService.login()
    ├── RegisterForm.tsx           wire handleSubmit → authService.signup()
    ├── TravelHeader.tsx           swap nav based on useAuth() state
    └── AccountPage.tsx           new — shows user profile + protected content
```

### Spring Boot (Phase C — future)

```java
// CustomCookieBearerTokenResolver — reads adv_access_token cookie
// SecurityConfig — wires resolver + issuer-uri + audience
// BookingsController — @AuthenticationPrincipal Jwt jwt
```

```yaml
# application.yml
spring.security.oauth2.resourceserver.jwt:
  issuer-uri: https://dev-raxs6tqu8i751qyo.us.auth0.com/
  audiences: https://adkstvite.api
```

---

## Phase B — Implementation (complete)

### Files created / modified

#### Java / OSGi (core bundle)

| File                                                                | Purpose                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `core/src/main/java/com/adkstvite/core/auth/Auth0Config.java`       | `@ObjectClassDefinition` metatype annotation — domain, clientId, clientSecret, audience, connection          |
| `core/src/main/java/com/adkstvite/core/auth/Auth0ProxyServlet.java` | `SlingAllMethodsServlet` bound to four paths (see below); calls Auth0 APIs server-side; sets HttpOnly cookie |

**Servlet paths registered:**

```
POST /bin/adkstvite/auth/login     → password grant → adv_access_token cookie
POST /bin/adkstvite/auth/signup    → /dbconnections/signup + auto-login → cookie
GET  /bin/adkstvite/auth/userinfo  → read cookie → proxy /userinfo → return user JSON
POST /bin/adkstvite/auth/logout    → clear cookie (Max-Age=0)
```

**Cookie spec:**

```
adv_access_token=<JWT>; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600
```

JS can never read this cookie → XSS-safe.

#### OSGi configuration

`ui.config/src/main/content/jcr_root/apps/adkstvite/osgiconfig/config/com.adkstvite.core.auth.Auth0Config.cfg.json`

Replace `REPLACE_WITH_YOUR_AUTH0_CLIENT_SECRET` with the secret from Auth0 dashboard
→ Application → Settings → Client Secret.

#### Frontend (ui.frontend)

| File                         | Purpose                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `travel/auth/authService.ts` | `login()`, `signup()`, `logout()`, `getUserInfo()` — all call `/bin/adkstvite/auth/*` with `credentials:'include'` |
| `travel/auth/useAuth.ts`     | `useAuth()` React hook — fetches userinfo on mount, returns `{ user, isAuthenticated, isLoading }`                 |
| `travel/TravelHeader.tsx`    | Auth-aware: shows Account link + **Sign Out** button when authenticated; Sign In + Register when not               |
| `travel/SignInForm.tsx`      | `handleSubmit` calls `authService.login()` → on success redirects to `/account.html`                               |
| `travel/RegisterForm.tsx`    | `handleSubmit` calls `authService.signup()` → on success redirects to `/account.html`                              |
| `travel/AccountPage.tsx`     | Protected island: reads `useAuth()`, redirects to sign-in if unauthenticated, shows user profile + Sign Out        |
| `travel/mount.tsx`           | Added `travel-account` → `<AccountPage />` mount case                                                              |

#### AEM component + content

| File                                                          | Purpose                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `ui.apps/.../components/travel-account/.content.xml`          | Component descriptor                                                |
| `ui.apps/.../components/travel-account/travel-account.html`   | HTL — just `<div id="travel-account"></div>` (all content is React) |
| `ui.content/.../content/adkstvite/us/en/account/.content.xml` | Account page node using `travel-page` template                      |

### Data flow

```
User fills sign-in form
  → SignInForm.handleSubmit
  → authService.login(email, password)
  → POST /bin/adkstvite/auth/login  (AEM servlet)
  → Auth0: POST /oauth/token (password grant)
  → 200 + access_token
  → AEM sets Set-Cookie: adv_access_token=<JWT>; HttpOnly; SameSite=Strict
  → Browser stores cookie (JS cannot see it)
  → React redirects to /account.html

On /account.html:
  → AccountPage mounts
  → useAuth() calls authService.getUserInfo()
  → GET /bin/adkstvite/auth/userinfo (AEM servlet)
  → AEM reads cookie → Auth0: GET /userinfo
  → Returns { sub, email, name, picture }
  → AccountPage renders user profile

Header on every page:
  → TravelHeader calls useAuth() on mount
  → If authenticated: shows user first name + Sign Out
  → If not: shows Sign In + Register
```

### Build command

```bash
mvn -pl ui.apps,ui.content,core,ui.config -am clean install -PautoInstallPackage
```

### Auth0 dashboard checklist (one-time)

1. **Applications → Settings**: enable "Resource Owner Password" grant type
2. **APIs → adkstvite**: confirm Audience = `https://adkstvite.api`
3. **Applications → Settings → Connections**: set "Default Directory" = `Username-Password-Authentication`
4. Fill `clientSecret` in `com.adkstvite.core.auth.Auth0Config.cfg.json` (never commit to git — use CI secrets)

---

## Phase B — Production Hardening Assessment

### What was production-standard from the start ✅

- OSGi proxy pattern — browser never calls Auth0 directly
- HttpOnly + SameSite=Strict cookie
- Password grant via server-side HTTP — credentials never hit browser DevTools
- `@Activate`/`@Modified` config reload without restart
- `Thread.currentThread().interrupt()` — proper InterruptedException handling
- Token expiry detection on `/userinfo` — clears stale cookie automatically

### Issues identified and fixed ✅

| Priority  | Issue                                               | Fix applied                                                                                                                               |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Must   | `Secure` flag missing (cookie sent over HTTP)       | `addCookie()` now appends `; Secure` when `request.isSecure()`                                                                            |
| 🔴 Must   | `clientSecret` in committed cfg.json                | Uses AEMaaCS `$[secret:AUTH0_CLIENT_SECRET]` variable substitution                                                                        |
| 🟠 Should | Hand-rolled JSON parser (brittle on nested objects) | Replaced with `jackson-databind` `ObjectMapper`                                                                                           |
| 🟠 Should | No brute-force protection on `/login` and `/signup` | `AuthRateLimitFilter` — sliding window, 10 req / 5 min per IP                                                                             |
| 🟡 Nice   | 1-hour hard logout (no silent refresh)              | Refresh token stored in `adv_refresh_token` HttpOnly cookie; `POST /refresh` endpoint; `useAuth` retries silently on 401                  |
| 🟡 Nice   | No CSRF protection                                  | CSRF double-submit cookie pattern: `_csrf` non-HttpOnly cookie issued on any GET; all POST endpoints verify `X-CSRF-Token` header matches |

### Phase B Hardening — Files changed

#### Java

| File                                 | Change                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `core/auth/Auth0ProxyServlet.java`   | Full rewrite: Jackson, Secure flag, CSRF validation, refresh token endpoint, `offline_access` scope on login |
| `core/auth/AuthRateLimitFilter.java` | New — Sling `Filter`, per-IP sliding window, returns 429                                                     |
| `core/pom.xml`                       | Added `jackson-databind` as `provided` dependency                                                            |

#### Config

| File                                                             | Change                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `osgiconfig/config/com.adkstvite.core.auth.Auth0Config.cfg.json` | `clientSecret` now uses `$[secret:AUTH0_CLIENT_SECRET]` AEMaaCS variable |

**How to set the secret in AEMaaCS Cloud Manager:**

1. Cloud Manager → Environment → ... (three dots) → Manage Variables
2. Add variable: Name = `AUTH0_CLIENT_SECRET`, Type = **Secret**, Value = your Auth0 client secret
3. Redeploy — AEM substitutes the value at container start time

#### Frontend

| File                  | Change                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/authService.ts` | `ensureCsrfToken()` reads `_csrf` cookie (fetches `/csrf` if missing); all `postJson` calls include `X-CSRF-Token` header; new `refreshToken()` function |
| `auth/useAuth.ts`     | On 401 from `getUserInfo`, silently calls `refreshToken()` then retries once before marking unauthenticated                                              |

### CSRF flow (double-submit cookie)

```
1. Any GET to /bin/adkstvite/auth/* (e.g. /userinfo on page load)
   → server issues: Set-Cookie: _csrf=<uuid>; SameSite=Strict; Path=/
   (NOT HttpOnly — JS can read it)

2. JS reads document.cookie → finds _csrf=<uuid>

3. POST /bin/adkstvite/auth/login
   → headers: X-CSRF-Token: <uuid>
   → server: reads _csrf cookie + X-CSRF-Token header, compares
   → mismatch → 403

Why this works: an attacker's page cannot read the _csrf cookie value
(SameSite=Strict blocks cross-site requests entirely; double-submit
adds defence-in-depth for subdomain scenarios).
```

### Refresh token flow

```
Login:          scope includes offline_access
                → Auth0 returns access_token + refresh_token
                → access_token  → adv_access_token  (HttpOnly, 1h)
                → refresh_token → adv_refresh_token (HttpOnly, 30d)

useAuth mount:  GET /userinfo → 401 (expired access token)
                → POST /refresh (sends adv_refresh_token cookie)
                → Auth0 returns new access_token
                → set new adv_access_token cookie
                → retry GET /userinfo → 200 → user logged in silently

30d expiry:     adv_refresh_token expires → /refresh returns 401
                → useAuth clears both cookies, sets isAuthenticated=false
                → user sees Sign In button, redirected on protected pages
```

### Rate limit behaviour

```
POST /login or /signup:
  Track per client IP in sliding 5-minute window
  First 10 requests: pass through
  11th request: 429 Too Many Requests {"error":"too many requests, try again later"}
  Window resets automatically as old timestamps expire

IP detection: X-Forwarded-For header (CDN/dispatcher), fallback to remoteAddr
```

---

## Phase B – Hardening Implementation (completed 2026-04-24)

All 6 production gaps identified in the assessment above have been implemented and deployed (build exit 0).

### Files changed

| File                                                                  | Change                                                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `core/src/main/java/com/adkstvite/core/auth/Auth0ProxyServlet.java`   | Full rewrite — Jackson ObjectMapper, Secure flag, CSRF double-submit, refresh endpoint, new paths `/refresh` + `/csrf` |
| `core/src/main/java/com/adkstvite/core/auth/AuthRateLimitFilter.java` | **NEW** — Sling Filter, per-IP sliding window (10 req / 5 min), returns 429 JSON                                       |
| `core/pom.xml`                                                        | Added `jackson-databind 2.15.4` provided dependency                                                                    |
| `ui.config/.../com.adkstvite.core.auth.Auth0Config.cfg.json`          | `clientSecret` now uses `$[secret:AUTH0_CLIENT_SECRET]` AEMaaCS variable syntax                                        |
| `ui.frontend/.../auth/authService.ts`                                 | Added `getCsrfToken()`, `ensureCsrfToken()`, CSRF header on all POSTs, `refreshToken()` export                         |
| `ui.frontend/.../auth/useAuth.ts`                                     | On 401 → silent `refreshToken()` → retry `getUserInfo()` → only unauthenticated if both fail                           |

### Cookie inventory (final state)

| Cookie              | HttpOnly | Secure     | SameSite | Max-Age | Readable by JS                  |
| ------------------- | -------- | ---------- | -------- | ------- | ------------------------------- |
| `adv_access_token`  | ✅       | when HTTPS | Strict   | 1 hour  | ❌                              |
| `adv_refresh_token` | ✅       | when HTTPS | Strict   | 30 days | ❌                              |
| `_csrf`             | ❌       | when HTTPS | Strict   | 30 days | ✅ (required for double-submit) |

### CSRF flow (double-submit cookie pattern)

```
1. Browser loads page → TravelHeader mounts → useAuth() calls GET /userinfo
2. Server issues _csrf UUID cookie (non-HttpOnly) in response
3. Browser stores _csrf in document.cookie (JS-readable, not cross-origin)
4. User submits login/signup form → authService reads _csrf cookie value
5. POST /login includes X-CSRF-Token: <uuid> header
6. Server compares X-CSRF-Token header == _csrf cookie value → accepts
7. Cross-origin attacker cannot read the _csrf cookie → CSRF blocked
```

### Refresh token flow

```
1. Login/signup requests scope "openid profile email offline_access"
2. Auth0 returns both access_token (1h) + refresh_token (long-lived)
3. Both stored as HttpOnly cookies
4. On next page load: useAuth() calls getUserInfo()
   - If 200 → user set, done
   - If 401 (access token expired) → refreshToken() POST /refresh
     - Server reads adv_refresh_token cookie, calls Auth0 grant_type=refresh_token
     - New adv_access_token cookie issued
     - getUserInfo() retried → user set silently
   - If refresh also 401 → user marked unauthenticated (cookies cleared)
```

### Rate limiter behaviour

| Scenario                                               | Response                                    |
| ------------------------------------------------------ | ------------------------------------------- |
| Requests 1–10 on POST /login or /signup (5 min window) | Passed through normally                     |
| Request 11+ within same window                         | HTTP 429 `{"error":"too many attempts..."}` |
| Window expires (5 min since oldest attempt)            | Counter resets, requests allowed again      |

### Cloud Manager secrets setup

To deploy to AEMaaCS author/publish:

1. Open Cloud Manager → Environments → (your env) → Configuration
2. Add environment variable: **Name** `AUTH0_CLIENT_SECRET`, **Type** Secret, **Value** `<your Auth0 client secret>`
3. Deploy — AEM resolves `$[secret:AUTH0_CLIENT_SECRET]` at OSGi config load time
