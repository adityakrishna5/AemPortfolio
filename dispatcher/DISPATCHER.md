# AEM Dispatcher — Configuration Guide & Changes

This document explains the AEM Dispatcher concepts relevant to this project and records every configuration change made during the auth integration.

---

## 1. What Is the AEM Dispatcher?

The AEM Dispatcher is an **Apache HTTP Server module** (`mod_dispatcher`) that sits in front of the AEM Publish tier. It does two things:

| Role              | What it means                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Reverse proxy** | Forwards incoming HTTP requests to AEM Publish on your behalf                                          |
| **Caching layer** | Stores Publish responses on disk and serves them directly without touching AEM for subsequent requests |

In local development (using the Dispatcher SDK Docker image) it runs on port `8080` and proxies to AEM Publish on port `4503`.

### Why you need it locally

Even though you could hit AEM Publish directly, routing traffic through the Dispatcher locally catches config bugs early — missing filter rules, cache pollution on auth pages, and stripped headers all cause bugs that only appear in production if you skip this step.

### How it starts

```bash
# From the dispatcher-sdk directory:
dispatcher-sdk-2.0.251/bin/docker_run.sh \
  /path/to/adkstvite/dispatcher/src \   # config dir — copied at container start
  host.docker.internal:4503 \            # AEM Publish address (from inside the container)
  8080                                   # port exposed to your browser
```

> **Important**: The SDK copies the config directory into the container at startup. It is **not** live-mounted. After any config change you must stop and restart the container for it to take effect.

### Validate config before restarting

```bash
dispatcher-sdk-2.0.251/bin/validator full /path/to/adkstvite/dispatcher/src
```

This runs the same validator that Adobe's Cloud Manager pipeline runs. Fix all errors before deploying.

---

## 2. `filters.any` — Access Control (the Firewall)

**File**: `conf.dispatcher.d/filters/filters.any`

### Concept

The filter file is the Dispatcher's firewall. The default rules (loaded via `$include "./default_filters.any"`) **deny every request** by default with a catch-all deny:

```
/0001 { /type "deny" /url "*" }
```

Every URL your application needs to serve must be **explicitly allowed** with a more specific rule. Rules are evaluated in numeric order; the last matching rule wins.

A rule can match on:

| Property     | Example              | Description        |
| ------------ | -------------------- | ------------------ |
| `/url`       | `"/content/*"`       | Exact path or glob |
| `/method`    | `"GET"`              | HTTP method        |
| `/extension` | `"html"`             | File extension     |
| `/selectors` | `"model"`            | Sling selector(s)  |
| `/path`      | `"/content/*"`       | Path prefix        |
| `/type`      | `"allow"` / `"deny"` | Access decision    |

### Changes made

```
# ── Auth0 proxy endpoints (/bin/adkstvite/auth/*) ────────────────────────────
# These are the Sling servlet paths registered by Auth0ProxyServlet.
# All methods must pass through; the dispatcher must NEVER cache responses.
/0200 { /type "allow" /method "GET"  /url "/bin/adkstvite/auth/userinfo" }
/0201 { /type "allow" /method "GET"  /url "/bin/adkstvite/auth/csrf" }
/0202 { /type "allow" /method "POST" /url "/bin/adkstvite/auth/login" }
/0203 { /type "allow" /method "POST" /url "/bin/adkstvite/auth/signup" }
/0204 { /type "allow" /method "POST" /url "/bin/adkstvite/auth/logout" }
/0205 { /type "allow" /method "POST" /url "/bin/adkstvite/auth/refresh" }
```

### Why these rules are needed

AEM's default Dispatcher config blocks every path under `/bin/` because that namespace contains arbitrary Sling servlets that should never be called from the internet in a typical CMS deployment. Our `Auth0ProxyServlet` uses `@SlingServletPaths` to register six Sling servlet paths under `/bin/adkstvite/auth/*`. Without explicit allow rules each call returned a `404` from the Dispatcher (the request never reached Publish).

### Why each endpoint needs its exact HTTP method

Mixing up methods is a common mistake. A rule for `GET /bin/adkstvite/auth/login` would never match a `POST`. Locking each rule to its correct method also prevents method-override attacks.

---

## 3. `cache/rules.any` — Cache Control

**File**: `conf.dispatcher.d/cache/rules.any`

### Concept

When the Dispatcher forwards a request to Publish it stores the response as a file under `/mnt/var/www/html` (inside the container) and serves that file directly for all subsequent identical requests — without touching AEM. This is what makes AEM fast for anonymous page views.

The cache rules control **which responses are stored**. Like filters, they are evaluated in order and the last match wins.

```
/glob "/content/adkstvite/*" /type "allow"   # cache this URL pattern
/glob "/bin/*"               /type "deny"    # never cache this URL pattern
```

The default rules cache everything under `/content/` with an HTML extension, which is correct for public pages. Auth-related URLs must be excluded.

### Changes made

```
# ── Never cache Auth0 proxy endpoints ────────────────────────────────────────
# Auth cookies, CSRF tokens and session state must always hit AEM Publish.
/0100 { /glob "/bin/adkstvite/auth/*" /type "deny" }

# ── Never cache the sign-in / register / account pages ───────────────────────
# These pages are gated behind auth state; caching them risks serving stale
# or incorrect personalised content to anonymous users.
/0101 { /glob "/content/adkstvite/*/sign-in.html"  /type "deny" }
/0102 { /glob "/content/adkstvite/*/register.html" /type "deny" }
/0103 { /glob "/content/adkstvite/*/account.html"  /type "deny" }
```

### Why auth endpoints must never be cached

The `/csrf` endpoint generates a unique HMAC-SHA256 signed token per response. If the Dispatcher cached it, every user would receive the same stale token, which would immediately fail validation on Publish. Similarly, `/userinfo` returns the current user's session state — caching it would serve one user's identity to another.

### Why auth pages must never be cached

The sign-in, register, and account pages are gated. If the Dispatcher cached a logged-in version of `/account.html` and served it to an anonymous visitor, the browser would display the cached authenticated markup. Denying cache for these pages forces every request to reach Publish, where the component (or a Sling filter) can enforce the auth redirect.

---

## 4. `clientheaders/clientheaders.any` — Header Forwarding Allowlist

**File**: `conf.dispatcher.d/clientheaders/clientheaders.any`

### Concept

The Dispatcher acts as a proxy between the browser and AEM Publish. By default it **strips most request headers** before forwarding. Only headers listed in `clientheaders.any` survive the trip.

This is a security feature: it prevents clients from injecting internal headers (like `X-Forwarded-Host` or custom auth headers) into the backend unless the operator has explicitly approved them.

The default file (`$include "./default_clientheaders.any"`) passes through standard headers: `Host`, `Cookie`, `Content-Type`, `Authorization`, `Cache-Control`, and a handful of others including AEM's own `CSRF-Token`.

### Changes made

```
# Auth0 proxy CSRF header — the double-submit cookie pattern sends the signed
# token in X-CSRF-Token. The default list only includes "CSRF-Token" (no X- prefix).
"X-CSRF-Token"
```

### Why `X-CSRF-Token` specifically

`Auth0ProxyServlet.java` reads the CSRF token with:

```java
String token = request.getHeader("X-CSRF-Token");
```

The default clientheaders list contained `"CSRF-Token"` (AEM's own internal CSRF header, no `X-` prefix) but **not** `"X-CSRF-Token"`. The Dispatcher was stripping the header before it reached Publish, so `request.getHeader("X-CSRF-Token")` returned `null`, the validation always failed, and every POST returned `403 CSRF token mismatch` even when the browser sent the correct token.

Adding `"X-CSRF-Token"` to the allowlist allows the header to pass through intact.

---

## 5. The CSRF Double-Submit Cookie Pattern

This pattern is worth understanding because it drove two of the three config changes above.

### The problem

A browser will automatically attach cookies to any request sent to a matching domain, including cross-site requests. A malicious page at `evil.com` can make the browser `POST` to `your-app.com/api/transfer-money` and the browser will include the session cookie — the classic CSRF attack.

### The double-submit cookie solution

1. **Server generates a token**: The `/csrf` endpoint generates a random token, signs it with an HMAC-SHA256 secret, and sends it back in two ways:
   - As a **cookie** (`_csrf`) with `SameSite=Strict` but **no `HttpOnly`** flag — so JavaScript can read it.
   - As a **JSON body field** for the frontend to store in memory.

2. **Browser sends the token as a header**: Before each mutating request (login, signup, logout, refresh), the frontend JavaScript reads the `_csrf` cookie and sends it as the `X-CSRF-Token` request header.

3. **Server validates both**: Publish checks that the `X-CSRF-Token` header is present and matches the `_csrf` cookie value. An attacker on `evil.com` cannot read the `_csrf` cookie (same-origin policy blocks cross-origin cookie reads) and therefore cannot set the matching header.

### Why the Dispatcher matters

The Dispatcher sits between browser and Publish:

- **Filter rules**: must allow `GET /csrf` to reach Publish (no filter rule → 404, no token generated).
- **Cache deny rule**: must never cache `/csrf` responses (cached → stale token, always fails).
- **Client header**: must forward `X-CSRF-Token` (stripped → null on Publish, always fails).

All three layers must be correctly configured for CSRF to work end-to-end.

---

## 6. Endpoint Summary

| Endpoint                             | Method | Filter rule   | Cached?      | Notes                     |
| ------------------------------------ | ------ | ------------- | ------------ | ------------------------- |
| `/bin/adkstvite/auth/csrf`           | GET    | `/0201` allow | No (`/0100`) | Returns signed CSRF token |
| `/bin/adkstvite/auth/login`          | POST   | `/0202` allow | No (`/0100`) | Requires `X-CSRF-Token`   |
| `/bin/adkstvite/auth/signup`         | POST   | `/0203` allow | No (`/0100`) | Requires `X-CSRF-Token`   |
| `/bin/adkstvite/auth/logout`         | POST   | `/0204` allow | No (`/0100`) | Requires `X-CSRF-Token`   |
| `/bin/adkstvite/auth/refresh`        | POST   | `/0205` allow | No (`/0100`) | Token refresh             |
| `/bin/adkstvite/auth/userinfo`       | GET    | `/0200` allow | No (`/0100`) | Returns current user JSON |
| `/content/adkstvite/*/sign-in.html`  | GET    | default allow | No (`/0101`) | Auth page                 |
| `/content/adkstvite/*/register.html` | GET    | default allow | No (`/0102`) | Auth page                 |
| `/content/adkstvite/*/account.html`  | GET    | default allow | No (`/0103`) | Authenticated page        |

---

## 7. Dispatcher Start / Stop / Restart Reference

```bash
# Start
/Users/aditya_k/Personal_projects_work/AEM2026/traditional/dispatcher-sdk-2.0.251/bin/docker_run.sh \
  /Users/aditya_k/Personal_projects_work/AEM2026/traditional/adkstvite/dispatcher/src \
  host.docker.internal:4503 \
  8080

# Stop — find the container and kill it
docker ps | grep dispatcher
docker stop <container-id>

# Validate config only (no Docker needed)
/Users/aditya_k/Personal_projects_work/AEM2026/traditional/dispatcher-sdk-2.0.251/bin/validator \
  full \
  /Users/aditya_k/Personal_projects_work/AEM2026/traditional/adkstvite/dispatcher/src
```

> Config is **copied** at container start — always stop and restart after any change to `conf.dispatcher.d/`.
