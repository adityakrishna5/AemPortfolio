# Server-Side Auth State in TravelHeader

## Problem

On every page load, the `TravelHeader` React component started with `isAuthenticated = false` and rendered the "Sign In / Register" buttons. After `useAuth()` resolved (an async `GET /userinfo` call), it re-rendered with the correct user state. This transition — Sign In → John Doe — was visible to the user as a flash on every page navigation.

## Solution

Move auth state resolution to the server. `TravelHeaderModel` reads the `adv_access_token` cookie, decodes the JWT payload (Base64, no network call), and exposes `isAuthenticated` and `displayName` as Sling Model properties. The HTL template writes these into the React mount point as `data-*` attributes. React reads them synchronously at mount time — the correct header state is rendered on first paint, no flip, no flash.

This is the standard pattern used by Adobe.com, Marriott.com, and other AEM Traditional + React island implementations.

---

## Files Changed

### 1. `core/src/main/java/com/adkstvite/core/models/travel/TravelHeaderModel.java`

**Changes:**

- `adaptables` changed from `Resource.class` to `{ SlingHttpServletRequest.class, Resource.class }` so the model receives the HTTP request and can read cookies.
- Added `SlingHttpServletRequest request` injection.
- Added `resolveAuthState()` — reads the `adv_access_token` cookie, calls `decodeJwt()`.
- Added `decodeJwt(String token)` — splits on `.`, Base64url-decodes the payload segment, extracts `exp` (expiry check), `name`, `nickname`, `email` fields using simple substring scanning (no JSON library dependency).
- Added `isAuthenticated()` and `getDisplayName()` getters.

**JWT decode logic:**

```
token = "header.payload.signature"
payload = Base64url_decode(token.split(".")[1])
→ {"sub":"auth0|...", "name":"John Doe", "exp":1234567890, ...}
```

The `exp` field is checked against `System.currentTimeMillis()` — an expired token is treated as unauthenticated. No signature verification is performed here; the cookie is `HttpOnly` and was set by our own `Auth0ProxyServlet`, so the trust boundary is the cookie itself.

---

### 2. `ui.apps/.../travel-header/travel-header.html`

**Changes:** Two new `data-*` attributes on the mount div:

```html
data-is-authenticated="${model.authenticated @ context='attribute'}"
data-display-name="${model.displayName @ context='attribute'}"
```

HTL's `context='attribute'` escaping ensures no XSS from the display name value.

---

### 3. `ui.frontend/.../travel/mount.tsx`

**Changes:** Two new props passed to `<TravelHeader>`:

```tsx
isAuthenticatedInitial={d.isAuthenticated === 'true'}
displayNameInitial={d.displayName ?? ''}
```

`d.isAuthenticated` is a string from the DOM dataset (`"true"` or `"false"`), so explicit `=== 'true'` comparison is required.

---

### 4. `ui.frontend/.../travel/TravelHeader.tsx`

**Changes:**

- Removed `useAuth` import — `useAuth` hook no longer called in this component.
- Added `isAuthenticatedInitial: boolean` and `displayNameInitial: string` props.
- Replaced `const { user, isAuthenticated } = useAuth()` with `const [isAuthenticated] = useState(isAuthenticatedInitial)`.
- `displayName` derived directly from `displayNameInitial` prop.
- Sign-out button still calls `logout()` from `authService` directly (pure client action).

---

## Data Flow (After Fix)

```
Browser GET /content/adkstvite/us/en/home.html
  → Sling resolves TravelHeaderModel
  → model.init() reads cookie adv_access_token
  → decodeJwt() → { authenticated: true, displayName: "John Doe" }
  → HTL renders:
      <div id="travel-header"
           data-is-authenticated="true"
           data-display-name="John Doe" ...>

Browser receives HTML
  → React bundle executes
  → mount.tsx reads dataset.isAuthenticated = "true", dataset.displayName = "John Doe"
  → TravelHeader mounts with isAuthenticatedInitial=true, displayNameInitial="John Doe"
  → First paint: "John Doe | Sign Out" ✓ — no flip, no flash
```

---

## What `useAuth` / `getUserInfo` Is Still Used For

- `AccountPage` — full profile data (email, picture, metadata) still fetched from `/userinfo`
- `SignInForm`, `RegisterForm` — these don't need auth state in the header
- Token refresh — handled inside `authService.ts` when a 401 is received

The header no longer participates in the auth API call lifecycle.

---

## Security Notes

- `adv_access_token` is `HttpOnly` — not readable by JS, only by server-side Sling Model. ✓
- Display name extracted from JWT payload is passed through HTL `context='attribute'` escaping before being written into HTML. ✓
- JWT expiry (`exp`) is checked; an expired token renders as unauthenticated. ✓
- No signature verification on the model side — acceptable because the cookie is `HttpOnly` and `SameSite=Lax` (set by Auth0ProxyServlet). A forged cookie would need to bypass cookie security controls, not just craft a JWT payload.
