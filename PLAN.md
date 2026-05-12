# adkstvite — Implementation Plan

Traditional AEM 6.5 / AEMaaCS ecommerce learning project. React + Vite frontend, Auth0 stateless JWT auth, Spring Boot backend APIs, MSM across EN / FR / ES.

> This plan is a learning roadmap — every phase is scoped so each AEM concept (Sling Models, Servlets, OSGi, Workflows, MSM, CF, XF, QueryBuilder, Dispatcher, Dynamic Media) is exercised at least once against a real feature.

---

## Table of Contents

1. [Goals & Scope](#1-goals--scope)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack Summary](#3-tech-stack-summary)
4. [Repository Layout (end state)](#4-repository-layout-end-state)
5. [Public vs Private Pages](#5-public-vs-private-pages)
6. [Auth0 — Sign-in / Sign-up / JWT (stateless)](#6-auth0--sign-in--sign-up--jwt-stateless)
7. [Content Modeling](#7-content-modeling)
8. [Product Page Variants (3 approaches)](#8-product-page-variants-3-approaches)
9. [Experience Fragment Product Showcase](#9-experience-fragment-product-showcase)
10. [DAM — Dynamic Media & Multi-Layout Assets](#10-dam--dynamic-media--multi-layout-assets)
11. [Components to Build](#11-components-to-build)
12. [Sling Models, Servlets, OSGi Services catalog](#12-sling-models-servlets-osgi-services-catalog)
13. [Workflows — the concept-coverage matrix](#13-workflows--the-concept-coverage-matrix)
14. [MSM — EN / FR / ES rollout](#14-msm--en--fr--es-rollout)
15. [Oak / JCR Queries & QueryBuilder — mastery plan](#15-oak--jcr-queries--querybuilder--mastery-plan)
16. [Spring Boot Backend APIs](#16-spring-boot-backend-apis)
17. [Dispatcher Setup](#17-dispatcher-setup)
18. [AEM Instance Management & Maintenance](#18-aem-instance-management--maintenance)
19. [Performance & Load Testing](#19-performance--load-testing)
20. [Security — OWASP Top 10 & PCI hygiene](#20-security--owasp-top-10--pci-hygiene)
21. [GDPR, Cookies, "Delete my account"](#21-gdpr-cookies-delete-my-account)
22. [Monitoring & Health Checks](#22-monitoring--health-checks)
23. [Runbook & Editor Training](#23-runbook--editor-training)
24. [Phase-by-Phase Roadmap](#24-phase-by-phase-roadmap)
25. [Definition of Done — per concept](#25-definition-of-done--per-concept)
26. [Gaps / Extras worth adding](#26-gaps--extras-worth-adding)

---

## 1. Goals & Scope

**Primary goals**

- Build a learning-grade ecommerce storefront on traditional AEM (no Adobe Commerce / no CIF).
- Exercise every major AEM concept (Sling Models, Servlets, OSGi, HTL, Dialogs, CF, XF, DAM, Dynamic Media, Workflows, MSM, QueryBuilder, Dispatcher, Replication, Service Users).
- Integrate a Spring Boot service as the external "system of record" for orders/inventory.
- Learn production-grade ops: load testing, OWASP, GDPR, monitoring, runbooks.

**Out of scope**

- Real payments (Stripe test-mode only).
- Production-grade search (start with QueryBuilder; Algolia/Solr optional later).
- Microservices beyond one Spring Boot app.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  - Auth0 SPA SDK  →  login / signup / token refresh          │
│  - Calls AEM servlets + Spring Boot API with Bearer JWT      │
└──────────────────────────────────────────────────────────────┘
              │                              │
              │ (HTTPS, JWT)                 │ (HTTPS, JWT)
              ▼                              ▼
┌────────────────────────┐        ┌──────────────────────────┐
│   AEM Dispatcher       │        │   Spring Boot API        │
│   - cache + filters    │        │   - Orders, Inventory,   │
│   - terminates TLS     │        │     Payments, Webhooks   │
└───────────┬────────────┘        │   - validates Auth0 JWT  │
            │                     │   - Postgres / H2        │
            ▼                     └──────────────────────────┘
┌────────────────────────┐                 │
│   AEM Publish (x N)    │─────────────────┘ (server-to-server)
│   - Auth0AuthHandler   │
│   - Sling Servlets     │
│   - CF reader          │
│   - DAM renditions     │
└───────────┬────────────┘
            │ replicate
┌────────────────────────┐
│   AEM Author           │
│   - Editors + Workflow │
│   - Content Fragments  │
│   - Experience Fragm.  │
│   - MSM Blueprints     │
└────────────────────────┘
```

---

## 3. Tech Stack Summary

| Layer       | Tech                                             |
| ----------- | ------------------------------------------------ |
| AEM         | 6.5.x or AEMaaCS SDK                             |
| JDK         | 11 (core bundle) / 17 (Spring Boot)              |
| Build       | Maven 3.9, Vite 8, Node 20                       |
| Frontend    | React 18, TypeScript, SCSS                       |
| Auth        | Auth0 (OIDC), JWT (RS256), stateless             |
| Backend API | Spring Boot 3.3, Java 17, Postgres 16, Flyway    |
| Payments    | Stripe (test mode)                               |
| Email       | AEM `com.day.cq.mailer` (local: MailHog)         |
| Cache       | AEM Dispatcher (Apache 2.4)                      |
| Search      | Oak indexes + QueryBuilder                       |
| Load test   | k6                                               |
| Monitoring  | Felix Health Checks, Prometheus scraper, Grafana |

---

## 4. Repository Layout (end state)

```
adkstvite/
├── core/                              ← existing AEM core bundle (Java/OSGi)
├── ui.frontend/                       ← existing Vite + React
├── ui.apps/                           ← existing AEM apps
├── ui.content/                        ← existing content pkg
├── ui.config/                         ← existing OSGi config pkg
├── all/                               ← existing aggregator
├── dispatcher/                        ← existing dispatcher (to be expanded)
├── it.tests/                          ← existing integration tests
├── ui.tests/                          ← existing Cypress tests
│
├── api/                               ← NEW Spring Boot service (sibling to AEM)
│   ├── src/main/java/com/adkstvite/api/
│   ├── src/main/resources/
│   ├── pom.xml
│   └── Dockerfile
│
├── infra/                             ← NEW: docker-compose, k6, grafana
│   ├── docker-compose.yml             ← AEM author+publish+dispatcher+postgres+mailhog
│   ├── k6/
│   │   ├── plp.js
│   │   ├── pdp.js
│   │   └── checkout.js
│   └── grafana/
│
├── DEVELOPMENT_GUIDE.md               ← existing
├── PLAN.md                            ← this file
└── vitechanges.md                     ← existing
```

---

## 5. Public vs Private Pages

Goal: exercise Sling authentication requirements, `cq:auth-requirement` mixin, and closed user groups.

### Public pages (no auth required, cached by dispatcher)

- `/content/adkstvite/shop/{lang}/home`
- `/content/adkstvite/shop/{lang}/category/*` (PLP)
- `/content/adkstvite/shop/{lang}/product/*` (PDP — three variants, see §8)
- `/content/adkstvite/shop/{lang}/about`
- `/content/adkstvite/shop/{lang}/search`

### Private pages (Auth0 required, never cached)

- `/content/adkstvite/shop/{lang}/account`
- `/content/adkstvite/shop/{lang}/account/orders`
- `/content/adkstvite/shop/{lang}/account/addresses`
- `/content/adkstvite/shop/{lang}/account/wishlist`
- `/content/adkstvite/shop/{lang}/checkout` (cart can be anon, checkout requires login)

### Enforcement mechanisms (learn all three)

1. **Sling `sling:authRequirement`** on the page node (declarative).
2. **AuthenticationRequirement service** registered per path (OSGi config).
3. **Custom `javax.servlet.Filter`** that short-circuits to 401 if no valid Auth0 JWT — used for private servlets (`/bin/adkstvite/account/*`).

### Dispatcher side

- `/filter` block: private paths → `/type "deny"` then `allow "auth=*"` (no caching).
- Add `Cache-Control: private, no-store` response header via Sling Filter for private pages.

---

## 6. Auth0 — Sign-in / Sign-up / JWT (stateless)

### Flow (Authorization Code + PKCE, SPA)

1. React uses `@auth0/auth0-react` → redirect to Auth0 Universal Login.
2. Auth0 returns an access token (RS256 JWT, `aud=https://api.adkstvite.com`).
3. React attaches `Authorization: Bearer <jwt>` to:
   - AEM endpoints under `/bin/adkstvite/*`
   - Spring Boot endpoints under `/api/*`
4. No session on server. Every request is independently verified.

### Sign-up

- Auth0 Universal Login supports sign-up out of the box — React just passes `screen_hint=signup`.
- On first successful login, a custom servlet `POST /bin/adkstvite/account/provision` creates the customer JCR profile at `/home/users/auth0/<hash(sub)>`.

### AEM-side verification

**`core/src/main/java/com/adkstvite/core/commerce/auth/`**

| Class                        | Responsibility                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `Auth0TokenValidator`        | Verifies JWT signature against Auth0 JWKS; caches JWKS 1h; checks `iss`, `aud`, `exp` |
| `Auth0AuthenticationHandler` | Implements `AuthenticationHandler`; paths `/bin/adkstvite` + private content paths    |
| `CustomerSession`            | `@Model(adaptables = SlingHttpServletRequest.class)` exposing `sub`, `email`, `roles` |
| `Auth0ProvisioningServlet`   | Creates JCR user profile on first login                                               |

**Dependencies (`core/pom.xml`)**

```xml
<dependency><groupId>com.auth0</groupId><artifactId>java-jwt</artifactId><version>4.4.0</version></dependency>
<dependency><groupId>com.auth0</groupId><artifactId>jwks-rsa</artifactId><version>0.22.1</version></dependency>
```

**OSGi config** (`ui.config/.../config/com.adkstvite.core.commerce.auth.Auth0TokenValidator.cfg.json`)

```json
{
  "issuer": "https://adkstvite.us.auth0.com/",
  "audience": "https://api.adkstvite.com",
  "jwksUrl": "https://adkstvite.us.auth0.com/.well-known/jwks.json",
  "jwksCacheTtlSeconds": 3600,
  "leewaySeconds": 5
}
```

### Spring Boot verification

Use `spring-boot-starter-oauth2-resource-server` with:

```yaml
spring.security.oauth2.resourceserver.jwt.issuer-uri: https://adkstvite.us.auth0.com/
spring.security.oauth2.resourceserver.jwt.audiences: https://api.adkstvite.com
```

### Roles & scopes

Auth0 custom claim `https://adkstvite.com/roles` → maps to AEM groups:

- `customer` → read own orders, submit reviews
- `admin` → access `/libs/wcm/...` (author UI)
- `warehouse` → access order-fulfillment workflow inbox

### Security checklist

- Validate `iss`, `aud`, `exp`, signature (RS256 only, reject `none`).
- Never log the JWT, not even truncated, in production.
- Refresh-token rotation enabled in Auth0 tenant.
- Short access-token TTL (10 min); long refresh-token TTL (30 days).

---

## 7. Content Modeling

### Content Fragment Models

Path: `/conf/adkstvite/settings/dam/cfm/models/`

| Model       | Fields                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product`   | sku, slug, name, shortDesc, description (multiline RTE), brand (tag), categories (tags, multi), price (decimal), compareAtPrice, currency (enum: USD/EUR/INR), images (content-reference, multi → DAM), variants (fragment-reference → Variant, multi), attributes (JSON), inStock (boolean), rating (number), metaTitle, metaDescription |
| `Variant`   | sku, size (tag), color (tag), stock (number), priceDelta, imageOverride                                                                                                                                                                                                                                                                   |
| `Review`    | productSku, authorSub, rating, title, body, verifiedPurchase, createdAt, status (draft/published/rejected)                                                                                                                                                                                                                                |
| `Promotion` | code, type (percent/flat), value, minCartValue, validFrom, validTo, categoryScope (tags, multi)                                                                                                                                                                                                                                           |

### Tag taxonomies

Path: `/content/cq:tags/adkstvite/`

- `categories/` (hierarchical: apparel/men/shirts, apparel/women/dresses, electronics/phones, …)
- `brands/`, `sizes/`, `colors/`, `genders/`

### Content structure

```
/content/adkstvite/shop/
├── language-masters/en   ← Blueprint (MSM)
├── us/en                 ← Live Copy
├── fr/fr                 ← Live Copy (rollout from EN master via translation workflow)
└── es/es                 ← Live Copy
```

### DAM structure

```
/content/dam/adkstvite/
├── products/<brand>/<sku>/ (hero.jpg, gallery-*.jpg, size-chart.pdf)
├── brands/
├── marketing/ (hero banners, XF imagery)
└── editorial/
```

### Commerce runtime data (not replicated)

```
/var/commerce/adkstvite/
├── carts/<auth0SubHash>/    ← anonymous carts also allowed (session-cookie-based key)
├── orders/<yyyy>/<mm>/<id>/
└── wishlists/<auth0SubHash>/
```

---

## 8. Product Page Variants (3 approaches)

You asked for two — I'm adding a third so you cover the full spectrum AEM offers.

### Variant A — Traditional HTL + Content Fragment

- Page path: `/content/adkstvite/shop/{lang}/product-cf/<sku>`
- Template: `product-cf-template`
- HTL component `productdetail-cf` adapts page to `ProductCfModel`, which reads the CF at `/content/dam/adkstvite/products/<sku>` via `ContentFragmentManager`.
- Full server-side render, SEO-ready, dispatcher-cacheable.
- **Learning focus**: CF API, `FragmentTemplate`, HTL, Sling Model adaptation from `Resource`.

### Variant B — SPA / Sling Model Exporter (JSON API)

- Page path: `/content/adkstvite/shop/{lang}/product/<sku>`
- Uses `productdetail` component with `@Exporter(name = "jackson", extensions = "json")`.
- React fetches `<page>.model.json` and renders client-side.
- Page model available at `/content/adkstvite/shop/{lang}/product/<sku>.model.json`.
- **Learning focus**: Sling Model Exporter, JSON API, `ComponentExporter`, SPA Editor.

### Variant C — Headless via GraphQL

- Path: `/content/_cq_graphql/adkstvite/endpoint.json`
- Persisted query `getProductBySku` against the `Product` CF model.
- Consumed directly by React (bypasses the AEM page entirely, served from Dispatcher/CDN).
- **Learning focus**: AEM Headless GraphQL, persisted queries, CF-only content delivery.

### Template comparison table (learning output)

Keep a table in `DEVELOPMENT_GUIDE.md` comparing TTFB, cacheability, SEO, DX — one row per variant.

---

## 9. Experience Fragment Product Showcase

- XF path: `/content/experience-fragments/adkstvite/{lang}/home/featured-products/master`
- Contains a `productcarousel` component that lists curated SKUs (configured via a Granite UI multifield picking from a path-browser rooted at `/content/dam/adkstvite/products`).
- Embedded on the home page via the XF component.
- Also exposed as a headless fragment: `.../master.content.html` (renders HTML) and `.../master.model.json` (renders JSON).
- **Learning focus**: XF authoring, XF variants, embedding XF across locales, XF → JSON delivery.

---

## 10. DAM — Dynamic Media & Multi-Layout Assets

### Single asset → many layouts

For each product hero image, generate renditions via an **Image Profile** at `/conf/adkstvite/settings/dam/processing/adkstvite-product-profile`:

| Rendition      | Size         | Use             |
| -------------- | ------------ | --------------- |
| `thumbnail`    | 200×200 crop | PLP card        |
| `card`         | 600×800 crop | Product teaser  |
| `hero-desktop` | 1920×800     | PDP hero banner |
| `hero-mobile`  | 800×1200     | PDP mobile      |
| `zoom`         | 2400×2400    | PDP lightbox    |
| `og`           | 1200×630     | Social share    |

### Smart Crop (Dynamic Media)

Enable Dynamic Media in author: assets get a `dam:renditions/dynamic-media` URL at `/is/image/adkstvite/<sku>?wid=800&fmt=webp`.

### Smart tags

Enable Adobe Sensei smart tags to auto-classify new product images. Used by a workflow to suggest categories.

### Processing profiles deployed from `ui.content`

```
ui.content/.../conf/adkstvite/settings/dam/processing/adkstvite-product-profile/.content.xml
```

### **Learning focus**

- `Asset`, `Rendition`, `AssetManager` APIs.
- `DynamicMediaServlet` / Scene7 URL signing.
- `asset.getMetadata()` for XMP fields.
- Image Profile vs Processing Profile (AEMaaCS Asset Compute).

---

## 11. Components to Build

| Component                   | Module      | HTL + Dialog                    | Sling Model                       | React mount              |
| --------------------------- | ----------- | ------------------------------- | --------------------------------- | ------------------------ |
| `productteaser`             | `commerce/` | yes                             | `ProductTeaserModel`              | `<ProductCard>`          |
| `productlist`               | `commerce/` | yes                             | `ProductListModel`                | `<ProductGrid>` + facets |
| `productdetail`             | `commerce/` | yes (3 variants)                | `ProductModel` / `ProductCfModel` | `<ProductDetail>`        |
| `productcarousel`           | `commerce/` | yes                             | `ProductCarouselModel`            | `<Carousel>`             |
| `minicart`                  | `commerce/` | yes                             | `CartModel`                       | `<MiniCart>`             |
| `cartpage`                  | `commerce/` | yes                             | `CartModel`                       | `<CartPage>`             |
| `checkout`                  | `commerce/` | yes (multi-step)                | `CheckoutModel`                   | `<Checkout>` (4 steps)   |
| `searchbar`                 | `commerce/` | yes                             | —                                 | `<SearchBar>` typeahead  |
| `accountdashboard`          | `commerce/` | yes                             | `CustomerSession`                 | `<AccountDashboard>`     |
| `orderhistory`              | `commerce/` | yes                             | `OrderHistoryModel`               | `<OrderHistory>`         |
| `reviewlist` + `reviewform` | `commerce/` | yes                             | `ReviewListModel`                 | `<Reviews>`              |
| `wishlistbutton`            | `commerce/` | no (inline)                     | —                                 | `<WishlistButton>`       |
| `promotionbanner`           | `commerce/` | yes                             | `PromotionModel`                  | —                        |
| `breadcrumb-commerce`       | `commerce/` | yes (proxies Core `breadcrumb`) | extends Core                      | —                        |

Re-use existing archetype components (`accordion`, `carousel`, `teaser`, `title`, `text`, `image`, `container`) wherever possible.

---

## 12. Sling Models, Servlets, OSGi Services catalog

### Sling Models (all `@Model(adaptables=…)`)

`ProductModel`, `ProductCfModel`, `ProductListModel`, `ProductTeaserModel`, `ProductCarouselModel`, `CartModel`, `CheckoutModel`, `OrderHistoryModel`, `ReviewListModel`, `PromotionModel`, `CustomerSession`, `BreadcrumbModel`.

### Servlets

All under `com.adkstvite.core.commerce.*.servlets`.

| Path                                   | Method | Purpose                                         |
| -------------------------------------- | ------ | ----------------------------------------------- |
| `/bin/adkstvite/catalog/products`      | GET    | JSON list with filters                          |
| `/bin/adkstvite/catalog/product/{sku}` | GET    | Single product JSON                             |
| `/bin/adkstvite/cart`                  | GET    | Read cart                                       |
| `/bin/adkstvite/cart/add`              | POST   | Add line item                                   |
| `/bin/adkstvite/cart/update`           | POST   | Update qty                                      |
| `/bin/adkstvite/cart/remove`           | POST   | Remove line                                     |
| `/bin/adkstvite/cart/coupon`           | POST   | Apply promo                                     |
| `/bin/adkstvite/checkout/init`         | POST   | Returns Stripe client secret                    |
| `/bin/adkstvite/checkout/confirm`      | POST   | Finalize order (server-to-server → Spring Boot) |
| `/bin/adkstvite/webhook/stripe`        | POST   | Stripe webhook (signature verified)             |
| `/bin/adkstvite/account/provision`     | POST   | First-login profile creation                    |
| `/bin/adkstvite/account/orders`        | GET    | Calls Spring Boot `/api/orders?sub=…`           |
| `/bin/adkstvite/account/delete`        | POST   | GDPR right-to-be-forgotten (see §21)            |
| `/bin/adkstvite/reviews`               | POST   | Submit review → triggers moderation workflow    |
| `/bin/adkstvite/search`                | GET    | QueryBuilder-backed search                      |

### OSGi Services

`CatalogService`, `CartService`, `CheckoutService`, `OrderService`, `PricingService`, `InventoryService`, `ReviewService`, `PromotionService`, `RecommendationService`, `ProductSearchService`, `Auth0TokenValidator`, `PaymentGatewayClient`, `BackendApiClient` (Spring Boot HTTP client), `EmailTemplateService`.

### OSGi Schedulers

- `AbandonedCartReminderScheduler` (daily 10:00).
- `PromotionExpirySweeper` (hourly).
- `DynamicMediaRenditionCatchup` (nightly, for assets that skipped workflow).

### Sling Filters

- `RateLimitFilter` — token-bucket, applies to `/bin/adkstvite/cart/*`, `/bin/adkstvite/checkout/*`.
- `PrivatePageCacheHeaderFilter` — injects `Cache-Control: private, no-store` for `/content/adkstvite/shop/*/account/*`.
- `CorrelationIdFilter` — MDC `X-Correlation-ID` for log tracing.

### Event Listeners

- `ProductCfChangeListener` — on `/content/dam/adkstvite/products/*` → invalidate dispatcher cache for PDP.
- `OrderCreatedListener` → enqueues fulfillment workflow.

---

## 13. Workflows — the concept-coverage matrix

Each workflow exercises a different feature so all workflow concepts are covered.

| Workflow                  | Concept coverage                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `review-moderation`       | Participant step (dynamic chooser picks moderator by product category), Process step (auto-spam heuristic), OR split, email notification   |
| `order-fulfillment`       | Process step calling external HTTP (Spring Boot), external service wait, Process step updating JCR                                         |
| `abandoned-cart-reminder` | Scheduler-launched workflow, Process step using `com.day.cq.mailer`                                                                        |
| `product-activation`      | Launcher on CF save, Process step generating DM renditions, Process step validating SEO fields, Conditional step, Publish replication step |
| `translation-rollout`     | Locale-aware Process step, integration with MSM Rollout Manager (EN → FR, EN → ES)                                                         |
| `gdpr-account-deletion`   | Long-running workflow: anonymize orders, delete profile, notify Auth0 Management API, send confirmation email                              |
| `review-publish`          | Sub-workflow invoked from `review-moderation` — exercises workflow composition                                                             |

Each Java process step goes in `core/src/main/java/com/adkstvite/core/workflow/steps/`. Each workflow model XML goes in `ui.content/.../conf/global/settings/workflow/models/adkstvite/<name>/`.

---

## 14. MSM — EN / FR / ES rollout

### Structure

- **Blueprint**: `/content/adkstvite/shop/language-masters/en`
- **Live Copies**:
  - `/content/adkstvite/shop/us/en`
  - `/content/adkstvite/shop/fr/fr`
  - `/content/adkstvite/shop/es/es`

### Rollout config

Custom config at `/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard`:

- Copies structure + content.
- `cq:ignoreRollout=true` on `price`, `currency`, `stock`, `compareAtPrice` (regional).

### Translation pipeline

- Language copies via `LanguageCopy` on Blueprint → feeds translation provider (use AEM-built-in **human translation workflow** or **Microsoft Translator** cloud service).
- Workflow `translation-rollout` handles: create language copy → send for translation → on completion, merge back.

### Dictionary (sling i18n)

`ui.apps/.../apps/adkstvite/i18n/en.json`, `fr.json`, `es.json` for UI strings (button labels, form labels). Already partially present (existing `fr.json`).

### Locale-aware routing

Dispatcher rewrite rule: if `Accept-Language` starts with `fr` and path is `/content/adkstvite/shop/home.html` → 302 to `/content/adkstvite/shop/fr/fr/home.html`.

---

## 15. Oak / JCR Queries & QueryBuilder — mastery plan

### Master these 5 query types by implementing each in the project

| #   | Query type                            | Where used                                             |
| --- | ------------------------------------- | ------------------------------------------------------ |
| 1   | QueryBuilder predicate map (Java)     | `ProductSearchService` — category + text search        |
| 2   | JCR-SQL2 via `QueryManager`           | `OrderService.findByDateRange()`                       |
| 3   | XPath (legacy, still valid)           | One-off admin servlet listing orphaned assets          |
| 4   | Oak full-text (`contains(., 'term')`) | PLP free-text search across product name + description |
| 5   | Faceted search (QueryBuilder facets)  | PLP facet sidebar                                      |

### Custom Oak indexes

Path: `/oak:index/` — deployed via `ui.apps/src/main/content/jcr_root/_oak_index/`.

| Index               | Definition                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `adkstvite-product` | property index on `sku`, `brand`, `categories`, `price` under `/content/dam/adkstvite/products` |
| `adkstvite-order`   | property index on `customerSub`, `createdAt`, `status` under `/var/commerce/adkstvite/orders`   |
| `adkstvite-lucene`  | Lucene full-text on `jcr:content/data/master/*` for Product CFs                                 |

### Learning exercises

1. Write the same query 3 ways (QueryBuilder → JCR-SQL2 → XPath) and compare results.
2. Explain query plans via `/system/console/jcr-resolver` → Query section.
3. Turn on `DEBUG` for `org.apache.jackrabbit.oak.query` and read the actual index that was chosen.
4. Build facet aggregation for categories/brand/price.
5. Compare performance of traversal vs indexed query on a 10k-product catalog.

---

## 16. Spring Boot Backend APIs

### Scope

The service handles concerns that don't belong in AEM: orders (source of truth), inventory, payments, admin ops. AEM calls it server-to-server; React also calls it directly for non-content reads.

### Module layout (`api/`)

```
api/
├── src/main/java/com/adkstvite/api/
│   ├── ApiApplication.java
│   ├── config/SecurityConfig.java            ← Resource Server JWT (Auth0)
│   ├── order/
│   │   ├── Order.java                        ← @Entity
│   │   ├── OrderController.java              ← /api/orders
│   │   ├── OrderService.java
│   │   └── OrderRepository.java
│   ├── inventory/
│   │   ├── Stock.java
│   │   ├── InventoryController.java
│   │   └── StockEventListener.java           ← Kafka/RabbitMQ (optional)
│   ├── payment/
│   │   ├── StripeService.java
│   │   └── StripeWebhookController.java      ← /api/webhooks/stripe
│   ├── catalog/
│   │   └── CatalogCacheController.java       ← optional read-through cache of AEM CF
│   ├── gdpr/
│   │   └── DeletionController.java           ← orchestrates account deletion
│   └── common/
│       ├── JwtAudienceValidator.java
│       ├── GlobalExceptionHandler.java
│       └── CorrelationIdFilter.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-prod.yml
│   └── db/migration/                         ← Flyway
│       ├── V1__initial.sql
│       ├── V2__inventory.sql
│       └── V3__orders.sql
├── src/test/java/...
├── pom.xml
└── Dockerfile
```

### Endpoints (contract shared with AEM)

```
POST   /api/orders                     ← create order (called by AEM checkout/confirm)
GET    /api/orders?sub={auth0Sub}      ← list my orders
GET    /api/orders/{id}
PATCH  /api/orders/{id}/status

GET    /api/inventory/{sku}
POST   /api/inventory/reserve          ← reserve stock during checkout
POST   /api/inventory/release

POST   /api/webhooks/stripe            ← Stripe → Spring Boot (signature verified)

DELETE /api/customers/{sub}            ← GDPR deletion
```

### Security

- `spring-boot-starter-oauth2-resource-server` validates Auth0 JWT.
- Custom `JwtAudienceValidator` ensures `aud=https://api.adkstvite.com`.
- Method-level `@PreAuthorize("hasAuthority('SCOPE_read:orders')")`.
- Server-to-server calls from AEM use **Client Credentials grant** (separate Auth0 M2M application) with scope `internal:orders`.

### Deployment

- `Dockerfile` (`eclipse-temurin:17-jre` base).
- `docker-compose.yml` in `infra/` wires AEM author + publish + dispatcher + Postgres + Spring Boot + MailHog + Grafana.

### Testing

- Unit: JUnit 5 + Mockito.
- Integration: Testcontainers (Postgres).
- Contract: Spring Cloud Contract or a manually-maintained OpenAPI spec committed at `api/src/main/resources/openapi.yml`.

### Observability

- `micrometer-registry-prometheus` → `/actuator/prometheus`.
- Structured JSON logs via `logstash-logback-encoder`.
- OpenTelemetry tracing → optional Jaeger.

---

## 17. Dispatcher Setup

Base the config on the **AEM Dispatcher Tools** and AEM Archetype's existing `dispatcher/src/conf.d` + `conf.dispatcher.d` layout.

### File map (`dispatcher/src/conf.dispatcher.d/`)

```
available_farms/
  default.farm            ← includes renders, filters, cache, virtualhosts
  enabled_farms/          ← symlinks
available_vhosts/
  adkstvite.vhost
  enabled_vhosts/
cache/
  default_rules.any       ← allow GET *.html, *.css, *.js, *.json, *.png, ...
  default_invalidate.any
filters/
  default_filters.any
  adkstvite_filters.any   ← project-specific rules
renders/
  default_renders.any     ← publish backend
clientheaders/
  default_clientheaders.any
rewrites/
  default_rewrite.rules
  adkstvite_rewrite.rules ← locale routing, pretty URLs
```

### Key filter rules (`adkstvite_filters.any`)

```apache
# Block admin endpoints on publish
/0100 { /type "deny"  /url "/libs/cq/*" }
/0101 { /type "deny"  /url "/crx/*" }
/0102 { /type "deny"  /url "/system/console/*" }

# Allow public content
/0200 { /type "allow" /method "GET" /url "/content/adkstvite/shop/*" }

# Allow our commerce endpoints (POST included)
/0300 { /type "allow" /method "GET"  /url "/bin/adkstvite/catalog/*" }
/0301 { /type "allow" /method "GET"  /url "/bin/adkstvite/search" }
/0302 { /type "allow" /method "POST" /url "/bin/adkstvite/cart/*" }
/0303 { /type "allow" /method "POST" /url "/bin/adkstvite/checkout/*" }
/0304 { /type "allow" /method "POST" /url "/bin/adkstvite/webhook/stripe" }
/0305 { /type "allow" /method "GET"  /url "/bin/adkstvite/account/*"  /auth "required" }

# Model.json for SPA PDP
/0400 { /type "allow" /method "GET" /url "/content/adkstvite/shop/*.model.json" }

# GraphQL persisted queries only
/0500 { /type "allow" /method "GET" /url "/graphql/execute.json/adkstvite/*" }

# Block live GraphQL on publish
/0501 { /type "deny"  /url "/content/_cq_graphql/*" }
```

### Cache rules (`default_rules.any`)

```apache
/0000 { /glob "*"                        /type "deny"  }
/0001 { /glob "*.html"                   /type "allow" }
/0002 { /glob "*.css"                    /type "allow" }
/0003 { /glob "*.js"                     /type "allow" }
/0004 { /glob "*.json"                   /type "allow" }
/0005 { /glob "/content/dam/*"           /type "allow" }

# NEVER cache private pages
/0100 { /glob "/content/adkstvite/shop/*/account/*" /type "deny" }
/0101 { /glob "/content/adkstvite/shop/*/checkout*" /type "deny" }
/0102 { /glob "/bin/adkstvite/cart/*"               /type "deny" }
/0103 { /glob "/bin/adkstvite/account/*"            /type "deny" }
```

### Invalidation

- Replication agent `flush` on publish triggers dispatcher invalidation.
- `ProductCfChangeListener` sends a custom flush for `/content/adkstvite/shop/*/product/<sku>*`.
- TTL fallback: 1h for PLP, 1h for PDP, 5min for home.

### TLS termination

Dispatcher's Apache terminates TLS; forwards `X-Forwarded-Proto` and `X-Forwarded-For` to publish.

### HSTS, security headers (via Apache `mod_headers`)

```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.auth0.com https://js.stripe.com; img-src 'self' data: https:; connect-src 'self' https://*.auth0.com https://api.stripe.com;"
```

### Local dev

Use `httpd:2.4-alpine` + AEM SDK dispatcher module in `infra/docker-compose.yml`.

---

## 18. AEM Instance Management & Maintenance

### Daily / weekly / monthly tasks

| Cadence | Task                                     | Tool                                         |
| ------- | ---------------------------------------- | -------------------------------------------- |
| Daily   | Check error.log, audit.log               | Log tailing / Splunk                         |
| Daily   | Verify replication queues                | `/etc/replication/agents.author.html`        |
| Weekly  | Run **Revision Cleanup**                 | OSGi console → Sling scheduler               |
| Weekly  | Run **DataStore Garbage Collection**     | JMX bean `RepositoryManagement`              |
| Weekly  | Run **Workflow Purge**                   | `com.adobe.granite.workflow.purge.Scheduler` |
| Weekly  | Run **Audit Log Purge**                  | OSGi config                                  |
| Weekly  | Verify Dispatcher cache size + hit ratio | `mod_status`                                 |
| Monthly | Apply AEM service pack / hotfix          | Package Manager                              |
| Monthly | Rotate Auth0 client secrets (M2M)        | Auth0 dashboard                              |
| Monthly | Restore-from-backup drill                | `crx-quickstart/backup`                      |

### Maintenance windows

Defined in OSGi config `com.adobe.granite.maintenance.impl.TaskScheduler` — run between 02:00–04:00 publisher local time.

### Backup strategy

- **Author**: nightly full offline backup of `crx-quickstart/repository/segmentstore` + `datastore`.
- **Publish**: no backup needed — rebuild from replication.
- **Spring Boot Postgres**: `pg_dump` nightly + WAL archiving.

### Disk & memory sizing (starting point, single-node)

- Author: 16 GB heap / 200 GB SSD.
- Publish: 8 GB heap / 100 GB SSD.
- Dispatcher: 2 GB / 50 GB (cache dir).

### Log management

- Rotation via `logback-configuration` — daily, 30-day retention.
- Ship to central system (ELK/Splunk) via Fluent Bit sidecar.

---

## 19. Performance & Load Testing

### Targets

- **PDP** p95 < 500 ms, p99 < 900 ms, error rate < 0.1%.
- **PLP** p95 < 500 ms (first page, 24 products).
- **Search** p95 < 300 ms (cached), < 800 ms (uncached).
- **Cart add** p95 < 200 ms.
- **Checkout confirm** p95 < 1500 ms (includes Stripe + Spring Boot).

### k6 scripts (`infra/k6/`)

- `plp.js` — 200 VUs, ramp 5m, steady 15m. Hits 10 category pages in loop.
- `pdp.js` — 500 VUs, hits 500 random SKUs. Verifies `<title>` and "Add to cart" button.
- `checkout.js` — 50 VUs, end-to-end: login → browse → add → checkout.

### Tooling

- Local: `docker run k6 run /scripts/pdp.js`.
- Output: InfluxDB → Grafana dashboard.

### Performance tactics applied before load test

- Dispatcher cache warmed with a crawler script.
- Oak indexes in place (§15).
- Image renditions pre-generated via `product-activation` workflow.
- HTL components use `data-sly-cache` where appropriate.
- React code-split per route; lazy-load checkout bundle.
- Gzip + Brotli on Apache.
- HTTP/2.

### Regression gate

CI fails if k6 thresholds breached: `http_req_duration{p(95)}<500` for PDP.

---

## 20. Security — OWASP Top 10 & PCI hygiene

### OWASP coverage

| OWASP 2021                         | Mitigation in project                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| A01 Broken Access Control          | Auth0 JWT + `@PreAuthorize`; AEM closed user groups on private paths               |
| A02 Cryptographic Failures         | HTTPS only; JWT RS256; Stripe TLS; no password storage (Auth0 handles it)          |
| A03 Injection                      | Sling Model `@ValueMapValue` auto-escapes; parameterized JCR-SQL2; Spring Data JPA |
| A04 Insecure Design                | Threat model documented in `docs/threat-model.md`; rate limits (§12)               |
| A05 Security Misconfiguration      | Dispatcher denies `/system/console`; Spring actuator secured; CSP header           |
| A06 Vulnerable Components          | `mvn versions:display-dependency-updates` monthly; `npm audit` in CI; Dependabot   |
| A07 Identification & Auth Failures | Auth0 enforces MFA-capable; short access tokens; refresh rotation                  |
| A08 Software & Data Integrity      | Maven signatures verified; Docker images pinned by digest                          |
| A09 Logging & Monitoring           | Structured logs, correlation IDs, Grafana alerts, Felix Health Checks              |
| A10 SSRF                           | Spring Boot validates outbound URLs allow-list (Stripe, Auth0 only)                |

### PCI — keep AEM out of scope

- React uses **Stripe Elements** (iframe). PAN never touches AEM or Spring Boot.
- We only store the Stripe payment-intent ID on the order.
- Stripe webhook signatures verified in `StripeWebhookController`.
- Logs sanitized — custom logback pattern masks any `4[0-9]{12}(?:[0-9]{3})?` (belt-and-braces).

### Scanning in CI

- **SAST**: SonarQube or GitHub CodeQL.
- **Dependency**: Dependabot + `mvn dependency-check:check`.
- **Container**: Trivy on Docker images.
- **DAST**: OWASP ZAP baseline scan against staging weekly.
- **Secrets**: Gitleaks pre-commit + CI.

---

## 21. GDPR, Cookies, "Delete my account"

### Cookie banner

- Use **Osano** / **CookieYes** / self-hosted `cookie-consent` component.
- Categories: Strictly Necessary, Functional, Analytics, Marketing.
- Loaded via `customheaderlibs.html`; blocks analytics scripts until consent given.

### Data map (documented in `docs/data-map.md`)

| Data             | Where stored                               | Retention                       |
| ---------------- | ------------------------------------------ | ------------------------------- |
| Auth0 profile    | Auth0 tenant                               | Until deletion request          |
| Cart             | `/var/commerce/adkstvite/carts/`           | 90 days                         |
| Orders           | Postgres `orders` table                    | 7 years (tax)                   |
| Reviews          | CFs under `/content/dam/adkstvite/reviews` | Until deletion, then anonymized |
| Wishlist         | `/var/commerce/adkstvite/wishlists/`       | Until deletion                  |
| Access logs      | Dispatcher/Apache                          | 30 days                         |
| Application logs | AEM + Spring Boot                          | 30 days                         |

### "Delete my account" flow (workflow `gdpr-account-deletion`)

1. User clicks "Delete account" in `AccountDashboard`.
2. `POST /bin/adkstvite/account/delete` → launches workflow.
3. Workflow steps:
   a. Anonymize orders in Postgres (`customer_sub` → `DELETED_<hash>`, keep for tax).
   b. Delete cart + wishlist JCR nodes.
   c. Anonymize reviews (`authorSub` → `DELETED_USER`).
   d. Call Auth0 Management API `DELETE /api/v2/users/{sub}`.
   e. Send confirmation email.
   f. Log audit record to `gdpr-audit` log.
4. SLA: complete within 30 days (GDPR Art. 17).

### DSAR (Data Subject Access Request)

- `GET /bin/adkstvite/account/export` returns a ZIP of all data for the current user.

---

## 22. Monitoring & Health Checks

### Felix Health Checks (`core/src/main/java/com/adkstvite/core/healthchecks/`)

| Class              | Checks                                   |
| ------------------ | ---------------------------------------- |
| `CatalogServiceHc` | Can read 1 product CF in < 200 ms        |
| `CartServiceHc`    | Can create + delete a test cart node     |
| `Auth0JwksHc`      | JWKS URL reachable + parseable           |
| `BackendApiHc`     | Spring Boot `/actuator/health` reachable |
| `DynamicMediaHc`   | DM ingest URL reachable                  |
| `ReplicationHc`    | No queue > 10 items, no blocked agents   |
| `DiskSpaceHc`      | `segmentstore` disk > 20% free           |

Tag each HC with `adkstvite` and one of: `critical`, `warn`, `info`.

### Exposure

- Felix HC → `/libs/granite/monitoring/healthchecks.json?tags=adkstvite`.
- Prometheus exporter (`aem-prometheus-exporter` bundle) scrapes HC + JMX.

### Dashboards (Grafana)

- AEM heap, threads, Sling job queues, replication queues.
- Dispatcher cache hit ratio.
- Spring Boot JVM + HTTP latency.
- k6 synthetic canary (runs every 5min against prod-like).

### Alerting

- Pager on any `critical` HC failing > 3 scrapes.
- Slack on `warn` HC + p95 latency > 700 ms for 5 min.

---

## 23. Runbook & Editor Training

### Runbook (`docs/runbook.md`)

For each common incident, document:

- Symptoms & how to detect.
- Diagnosis steps (log locations, JMX beans, dispatcher).
- Mitigation (rolling restart, flush, failover).
- Rollback.
- Post-mortem template.

Minimum runbook entries:

1. AEM publish is slow / OOM.
2. Dispatcher cache poisoned — how to flush specific paths.
3. Auth0 JWKS unreachable — fallback to cached keys.
4. Stripe webhook stops arriving.
5. Replication queue blocked.
6. Oak index corruption (async index behind).
7. Spring Boot pod crashloop.
8. Disk full on publish.

### Content editor training (`docs/editor-training.md`)

- How to create a new product CF (include screenshots, ~20 steps).
- How to author a PDP page (pick template, add components, set SEO fields).
- How to create a Promotion CF.
- How to trigger a rollout from EN to FR/ES.
- How to approve a review.
- How to use Smart Crop for a new hero.
- Glossary of CF / XF / Live Copy.

Deliver as a 1-hour session + recorded video + PDF cheat sheet.

---

## 24. Phase-by-Phase Roadmap

Phases are sequential; steps inside a phase can be parallelized.

### Phase 0 — Unblock (1–2 days)

- [ ] Fix current `mvn clean install` failure (exit 1 in last terminal).
- [ ] Create Auth0 tenant, SPA application, API (audience `https://api.adkstvite.com`), M2M application for AEM→Spring Boot.
- [ ] Scaffold `api/` Spring Boot module + CI build.
- [ ] Scaffold `infra/docker-compose.yml`.

### Phase 1 — Foundation scaffolding (3–5 days)

- [ ] Create `commerce/` Java package tree under `core`.
- [ ] Add Auth0 deps to `core/pom.xml`.
- [ ] Create service user + ACL package.
- [ ] Add OSGi configs in `ui.config/` (Auth0, Stripe, pricing).
- [ ] Install Auth0 React SDK in `ui.frontend/`; wrap `<Auth0Provider>`.
- [ ] Create `PLAN.md` (this file) ✅ and keep it updated.

### Phase 2 — Content model + CF data (3–4 days)

- [ ] Create `Product`, `Variant`, `Review`, `Promotion` CF Models.
- [ ] Create tag taxonomies.
- [ ] Seed 20 products + images in DAM.
- [ ] Create Image Profile (Dynamic Media).
- [ ] Implement `CatalogService`, `ProductModel`, `ProductCfModel`.

### Phase 3 — Templates & core pages (5–7 days)

- [ ] Editable templates: `home`, `category`, `product-cf`, `product`, `checkout`, `account`.
- [ ] Site root `/content/adkstvite/shop/language-masters/en`.
- [ ] Build `productteaser`, `productlist`, `productdetail` (3 variants), `searchbar`, `breadcrumb-commerce`.
- [ ] Catalog servlets + QueryBuilder-based search.
- [ ] End-to-end browse on publish (anonymous).

### Phase 4 — Auth0 + Account (4–6 days)

- [ ] `Auth0TokenValidator` + `Auth0AuthenticationHandler` + unit tests.
- [ ] `Auth0ProvisioningServlet`.
- [ ] React login/logout wiring; private-route wrapper.
- [ ] `AccountDashboard`, `OrderHistory` (stub).
- [ ] Protected servlet `/bin/adkstvite/account/orders`.
- [ ] Milestone: **log in, hit protected endpoint, see JWT claims**.

### Phase 5 — Cart, Checkout, Payments (6–9 days)

- [ ] `CartService`, `CartServlet`, JCR storage under `/var/commerce/adkstvite/carts/`.
- [ ] `<MiniCart>`, `<CartPage>`.
- [ ] `<Checkout>` 4-step React flow + Stripe Elements iframe.
- [ ] `CheckoutService.confirm()` calls Spring Boot `POST /api/orders`.
- [ ] Stripe webhook → `OrderConfirmationServlet` → workflow.
- [ ] Order-confirmation email (`com.day.cq.mailer` + MailHog locally).

### Phase 6 — Reviews, XF showcase, Promotions (4–5 days)

- [ ] `ReviewService` + servlets + `review-moderation` workflow.
- [ ] XF `featured-products` on home page (EN + FR + ES variants).
- [ ] `PromotionService` + promotion banner component.
- [ ] Recommendations ("you may also like") via QueryBuilder (same category).

### Phase 7 — MSM rollout (3–4 days)

- [ ] Create Live Copies for `us/en`, `fr/fr`, `es/es`.
- [ ] Custom rollout config with `cq:ignoreRollout` on price/currency/stock.
- [ ] Translation workflow (AEM built-in or Microsoft Translator).
- [ ] Locale router in Dispatcher.
- [ ] i18n dictionaries (`en`, `fr`, `es`).

### Phase 8 — Workflows & schedulers (4–5 days)

- [ ] `order-fulfillment`, `abandoned-cart-reminder`, `product-activation`, `gdpr-account-deletion`.
- [ ] Schedulers for abandoned carts, promotion expiry, DM rendition catchup.
- [ ] Event listeners (`ProductCfChangeListener` → dispatcher flush).

### Phase 9 — Dispatcher, security, hardening (5–7 days)

- [ ] Dispatcher filters, cache rules, rewrites (§17).
- [ ] Security headers + CSP tuned to Auth0 + Stripe.
- [ ] Rate-limit filter on cart/checkout.
- [ ] OWASP ZAP baseline scan; fix findings.
- [ ] SAST, dep-scan, container scan in CI.
- [ ] Cookie consent banner + GDPR pages.
- [ ] `gdpr-account-deletion` end-to-end.

### Phase 10 — Observability & load test (3–4 days)

- [ ] All 7 Felix Health Checks.
- [ ] Prometheus + Grafana dashboards.
- [ ] k6 scripts + CI threshold gate.
- [ ] Load test: meet p95 < 500 ms on PDP/PLP.
- [ ] Performance tuning until targets green.

### Phase 11 — Ops & handover (3 days)

- [ ] `docs/runbook.md` (8 scenarios minimum).
- [ ] `docs/editor-training.md` + recorded video.
- [ ] Backup + restore drill.
- [ ] Monthly maintenance calendar.

---

## 25. Definition of Done — per concept

Each concept only "graduates" when:

| Concept        | Done when                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------- |
| Sling Model    | Adapts from Resource AND SlingHttpServletRequest; unit tested with `AemContext`              |
| Servlet        | Both resource-type-bound AND path-bound versions exist in the codebase; both unit tested     |
| OSGi Service   | Interface + impl, OCD-driven config, 1+ consumer, 1+ unit test                               |
| OSGi Scheduler | At least one runs against real JCR data                                                      |
| Event Listener | Triggered + observed invalidating dispatcher                                                 |
| Sling Filter   | Rate-limit filter live on cart endpoints                                                     |
| HTL            | `data-sly-use`, `data-sly-list`, `data-sly-resource`, `data-sly-template` all used somewhere |
| Dialog         | Plain textfield, rich text, multifield, pathbrowser, and checkbox used in the codebase       |
| CF             | Model created + authored + rendered + rolled out via MSM                                     |
| XF             | Rendered server-side AND delivered as `.model.json`                                          |
| DAM            | Dynamic Media rendition served on PDP; Smart Crop verified                                   |
| Workflow       | 7 workflows in §13 all deployed and triggered in a demo                                      |
| MSM            | Rollout from EN → FR + ES verified; ignoreRollout confirmed on price                         |
| QueryBuilder   | All 5 query types in §15 demonstrated                                                        |
| Oak Index      | Custom Lucene index serving full-text search, query plan verified                            |
| Dispatcher     | Anon PLP cached (hit ratio > 90% under k6); private paths never cached                       |
| Health Checks  | All 7 HCs green in staging; alerts wired                                                     |
| Load test      | k6 run passes thresholds in CI                                                               |

---

## 26. Gaps / Extras worth adding

These are NOT in your original list but are standard for a project of this scope — recommend including:

1. **Editable Templates & Template Types** — you need these for the product / category / checkout pages anyway.
2. **Context-Aware Configurations (CAConfig)** — per-locale currency, tax rate, Stripe publishable key.
3. **Sitemap generator servlet** — `/sitemap.xml` for SEO.
4. **`robots.txt` per environment** (runmode-specific servlet).
5. **Structured data** — schema.org `Product` + `BreadcrumbList` JSON-LD emitted in `customheaderlibs.html`.
6. **Canonical URL handling** — especially across MSM locales (`<link rel="alternate" hreflang>`).
7. **Accessibility audit** — axe-core in Cypress tests; WCAG 2.1 AA required for checkout.
8. **Feature flags** — toggle wishlists, recommendations, A/B variants. Use a simple OSGi config service or LaunchDarkly.
9. **Inventory reservation** — prevent overselling during checkout. Spring Boot `POST /api/inventory/reserve` with TTL.
10. **Idempotency keys** — on cart-add, checkout-confirm, webhook. Prevents double-orders on retry.
11. **Admin UI in AEM** — Granite UI page at `/apps/adkstvite/tools/commerce/dashboard.html` showing orders, stock warnings. Exercises Granite Columns + ExtJS-free Coral components.
12. **Staged content / Launches** — schedule a promotion to go live at midnight; exercise AEM Launches feature.
13. **Email templates** — Sling Model-backed HTML emails (order confirmation, shipment, abandonment). Exercises `MessageTemplate` API.
14. **Search analytics** — log every query to JCR `/var/adkstvite/search-analytics/yyyy/mm/dd` to see top zero-result queries.
15. **A/B testing** — without Adobe Target, use a simple Sling Model that picks variant by hash of user sub + experiment id.
16. **Multi-currency** — even without Adobe Commerce, implement display conversion via `PricingService.formatForLocale()`.
17. **Order PDF invoice** — Thymeleaf + OpenHTMLtoPDF in Spring Boot.
18. **Operational `/status` endpoint** in Spring Boot aggregating DB, Auth0, Stripe health.
19. **Blue/green (or rolling) deploy** plan for AEM (use package manifest + replication queue drain).
20. **Disaster recovery doc** — RTO 4h, RPO 1h targets; backup restore runbook.

Say the word and I'll expand any of these into concrete tasks and file-level code.

---

## 27. MSM + Secured Nav + React Integration Roadmap

### 27.1 Do You Need MSM?

Only if you have multiple sites/locales sharing structure.

| Scenario                                 | MSM needed?                 |
| ---------------------------------------- | --------------------------- |
| Single site `adkstvite/us/en`            | No                          |
| Add `adkstvite/uk/en` with same template | Yes                         |
| Add `adkstvite/fr/fr` (translated)       | Yes (+ Language Copy)       |
| White-label for another brand            | Yes (Blueprint → Live Copy) |

**If you add MSM later:**

- Create a Blueprint at `/content/adkstvite/blueprint`
- Live Copies inherit structure/template, override content per region
- Rollout configs control what syncs (template, nav, policies) vs what's local (page content, language)

**For now: skip MSM.** Finish the single-site travel build first.

---

### 27.2 Why Header & Footer Must Be Experience Fragments

The current setup authors header/footer inside each page's JCR (`/content/adkstvite/us/en/home/jcr:content/.../header-mount`). Problems:

- Changing nav links = editing every page's `.content.xml` separately
- No single publish action propagates to all pages
- Adding a new page template means copy-pasting the same header/footer nodes again

**What Experience Fragments give you:**

| Concern         | Without XF (current) | With XF            |
| --------------- | -------------------- | ------------------ |
| Nav link change | Edit every page      | Edit XF once       |
| Publish         | Activate every page  | Activate one XF    |
| Multi-template  | Duplicate nodes      | Single reference   |
| A/B testing     | Per-page             | XF Variation       |
| Analytics       | Per-component        | XF-level targeting |

**Migration steps:**

1. Create XF at `/content/experience-fragments/adkstvite/header/master` with `travel-header` component
2. Create XF at `/content/experience-fragments/adkstvite/footer/master` with `travel-footer` component
3. Replace `travel-header-area` in `structure/.content.xml` with `core/wcm/components/experiencefragment/v2/experiencefragment` (no `editable=true`)
4. Remove `travel-header-area` and `travel-footer-area` from every page's `.content.xml`
5. Remove them from `initial/.content.xml` too

---

### 27.3 Building a Template From Scratch — Key Rules

An AEM editable template lives at `/conf/<site>/settings/wcm/templates/<name>/` and has 4 parts:

1. **Root `.content.xml`** — `cq:Template`, `allowedPaths`, `cq:status=enabled`, `ranking`
2. **`structure/.content.xml`** — locked layout skeleton. Only containers get `editable=true`. Editable containers must be **self-closing** (no children). XF references here are locked (no `editable=true`).
3. **`initial/.content.xml`** — default content pre-populated when a new page is created from this template
4. **`policies/.content.xml`** — maps each zone to a policy that controls allowed components and CSS grid settings

**Critical rules learned:**

- `editable=true` **only on containers**, never on leaf components — leaf + `editable=true` → `structure:true` in editConfig → locked gray overlay, no edit actions
- **Editable containers must be self-closing** in `structure/` — children inside block AEM from generating `data-path` overlays
- Default content goes in `initial/`, not `structure/`
- Header/footer in `structure/` should reference XFs or be plain locked components, never `editable=true`

---

### 27.4 Secured Pages — How Nav Items Change

This is a 3-layer problem: AEM controls structure, React controls rendering, auth provider controls state.

```
AEM (what CAN appear)  →  Auth State (what SHOULD appear)  →  React (what DOES appear)
```

**AEM layer** — author all nav items, tag secured ones in dialog:

```xml
<nav-item-dashboard
    jcr:primaryType="nt:unstructured"
    label="My Trips"
    href="/content/adkstvite/us/en/dashboard"
    secured="{Boolean}true"
    unauthenticatedHref="/content/adkstvite/us/en/sign-in"/>

<nav-item-signin
    jcr:primaryType="nt:unstructured"
    label="Sign In"
    href="/content/adkstvite/us/en/sign-in"
    secured="{Boolean}false"
    hideWhenAuthenticated="{Boolean}true"/>
```

**Sling Model layer** — expose auth-aware nav JSON, pass as `data-nav-items` on HTL mount point.

**React layer** — filter nav items based on `useAuth()` hook:

```tsx
const visibleItems = navItems.filter((item) => {
  if (item.secured && !isAuthenticated) return false;
  if (item.hideWhenAuthenticated && isAuthenticated) return false;
  return true;
});
```

---

### 27.5 Full React Integration Roadmap

#### Phase 1 — Foundation (current state)

- [x] AEM components with HTL data-\* bridge
- [x] React mount points via MutationObserver
- [ ] Move header/footer to Experience Fragments
- [ ] XF HTL passes nav JSON as `data-nav-items`

#### Phase 2 — Auth Layer

- Build `/bin/adkstvite/auth/me` Sling servlet → reads AEM session or JWT cookie → returns `{userId, name, email, roles[]}`
- React `useAuth()` hook calls this endpoint on mount
- `AuthContext` wraps the whole app (or just header mount)
- Protected pages: React checks auth before rendering, redirects to `/sign-in` if needed

#### Phase 3 — State Sharing Across Mounts

Current architecture has isolated React roots per component. Options:

| Pattern                               | Use when                           |
| ------------------------------------- | ---------------------------------- |
| `window.__ADKST_STATE__` global       | Simple auth flag, small state      |
| Custom events (`dispatchEvent`)       | Cross-mount communication          |
| Zustand singleton                     | Complex shared state (recommended) |
| Single React root wrapping all mounts | Full SPA migration                 |

**Recommended:** Zustand singleton — shared across all mount points, no Provider needed:

```ts
// store/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

#### Phase 4 — Personalization

- AEM ContextHub segments by geo, device, auth state → targets different XF variations
- Or drive via user roles from `/bin/adkstvite/auth/me` purely in React

#### Phase 5 — MSM (if multi-region)

- Blueprint → rollout to `/content/adkstvite/uk/en`, `/fr/fr`
- Each Live Copy inherits template + XF references, overrides page content + locale nav labels
- Language Copy for translations

---

### 27.6 Execution Order

1. XF migration (header/footer) — single source of truth for nav
2. `/bin/adkstvite/auth/me` servlet — enables all auth features
3. `useAuth()` + nav filtering in React — secured nav done
4. Zustand auth store shared across mounts — cross-component state
5. MSM only if a second locale is added — defer until needed

---

## 28. Implementation Log — XF Migration + MSM Scaffolding (2026-04-24)

Completed work converting header/footer from per-page components into shared Experience Fragments, plus scaffolding MSM for `en` (master) → `fr`, `es`.

### 28.1 Files Changed

**Experience Fragment content (reuses existing XF pages)**

| File                                                                                          | Change                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui.content/.../content/experience-fragments/adkstvite/us/en/site/header/master/.content.xml` | Replaced archetype `navigation`/`languagenavigation`/`search` with `header-mount` using `sling:resourceType="adkstvite/components/travel-header"` — same brand/nav props used previously on pages |
| `ui.content/.../content/experience-fragments/adkstvite/us/en/site/footer/master/.content.xml` | Replaced archetype `separator`+`text` with `footer-mount` using `sling:resourceType="adkstvite/components/travel-footer"` — includes quickLinks + topDestinations                                 |

**Travel-page template**

| File                                               | Change                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.../templates/travel-page/structure/.content.xml` | `travel-header-area` + `travel-footer-area` (editable containers) → `header-xf` + `footer-xf` (locked, `sling:resourceType="adkstvite/components/experiencefragment"`, `fragmentVariationPath="/content/experience-fragments/adkstvite/us/en/site/header/master"`). Only `main-content` remains `editable=true`. |
| `.../templates/travel-page/initial/.content.xml`   | Simplified to only `main-content` empty container — no more header/footer defaults                                                                                                                                                                                                                               |
| `.../templates/travel-page/policies/.content.xml`  | Removed `travel-header-area`/`travel-footer-area` mappings. Added `header-xf → policy_header`, `footer-xf → policy_footer` (existing XF policies in `/conf/adkstvite/settings/wcm/policies/adkstvite/components/experiencefragment/`). `main-content` still maps to `policy_649128221558427`.                    |

**Pages** (all 4 cleaned)

| File                                                | Change                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.../content/adkstvite/us/en/home/.content.xml`     | Removed `travel-header-area` + `travel-footer-area` subtrees — page now contains only `main-content` (hero + about + destinations) |
| `.../content/adkstvite/us/en/about-us/.content.xml` | Same cleanup                                                                                                                       |
| `.../content/adkstvite/us/en/sign-in/.content.xml`  | Same cleanup                                                                                                                       |
| `.../content/adkstvite/us/en/register/.content.xml` | Same cleanup                                                                                                                       |

**MSM scaffolding** (new files)

| File                                                                             | Purpose                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.../content/adkstvite/fr/.content.xml`                                          | French locale root (`cq:Page`) with 302 redirect to `/content/adkstvite/fr/fr`                                                                                                                                             |
| `.../content/adkstvite/fr/fr/.content.xml`                                       | French site root — `cq:PageContent` with mixins `[cq:LiveRelationship, cq:LiveSyncConfig]`, `cq:master=/content/adkstvite/us/en`, `cq:rolloutConfigs=[…adkstvite-standard]`, `cq:isDeep=true`, `jcr:language=fr`           |
| `.../content/adkstvite/es/.content.xml`                                          | Spanish locale root                                                                                                                                                                                                        |
| `.../content/adkstvite/es/es/.content.xml`                                       | Spanish site root — same MSM mixins with `jcr:language=es`                                                                                                                                                                 |
| `.../conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard/.content.xml` | `cq:Page` with `cq:RolloutConfig` jcr:content, `cq:trigger=rollout`, 9 standard Live Sync actions (contentUpdate, contentCopy, contentDelete, referencesUpdate, pageMoveUpdate, pageDelete, workflow, versionCopy, notify) |

### 28.2 Validation Errors Hit & Fixed

| Error                                                                                                         | Root cause                                                                                 | Fix                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Node 'adkstvite-standard [cq:RolloutConfig]' is not allowed as child of node with types [nt:folder]`         | `cq:RolloutConfig` was placed directly under `rolloutconfigs/` folder (nt:folder)          | Made the rollout config a `cq:Page`; moved `cq:RolloutConfig` onto the page's `jcr:content` node                                                   |
| `Mandatory property 'cq:master' missing in node with types [cq:LiveRelationship, cq:LiveSyncConfig, cq:Page]` | Had `cq:master` on a child `cq:LiveSyncConfig` node instead of on the page's `jcr:content` | Moved `cq:master`, `cq:isDeep`, `cq:rolloutConfigs` directly onto `jcr:content`; added mixins `[cq:LiveRelationship, cq:LiveSyncConfig]` there too |
| `Filter root's ancestor '/content/dam/adkstvite' is not covered` (WARNING only)                               | Existing in filter.xml                                                                     | No action — warning only                                                                                                                           |

### 28.3 Verification

Post-deploy HTTP status checks (all 200):

```
/content/adkstvite/us/en/home.html                                    200
/content/adkstvite/fr/fr.json                                         200
/content/adkstvite/es/es.json                                         200
/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard.json   200
/content/experience-fragments/adkstvite/us/en/site/header/master.html 200
```

Home page editor `data-path` entries (`?wcmmode=edit`):

```
hero-mount          structure=False  actions=3   ← editable
about-mount         structure=False  actions=3   ← editable
destinations-mount  structure=False  actions=3   ← editable
*                   structure=False  actions=1   ← INSERT placeholder
main-content        structure=True   actions=0   ← locked template container (expected)
```

Header/footer no longer appear in editable data-paths — they are now **locked XF references** rendered server-side from the shared XF.

### 28.4 How MSM Rollout Now Works

1. Author edits `/content/adkstvite/us/en/home` (the master).
2. From Tools → Sites → MSM Dashboard, trigger a Rollout on `/content/adkstvite/fr/fr` or `/content/adkstvite/es/es`.
3. The `adkstvite-standard` rollout config runs its 9 Live Sync actions → copies page structure, content, references, and triggers workflow.
4. Existing pages in the live copy inherit changes; editors can override any field (inheritance is then broken for that field only).
5. New pages created under `/content/adkstvite/us/en/*` automatically flow to both live copies on next rollout.

### 28.5 Remaining MSM Work (Not Yet Done)

Scaffolded but **not complete** — requires either AEM UI operations or additional content commits:

- [ ] **Initial page rollout**: no `home`, `about-us`, `sign-in`, `register` pages exist under `fr/fr` or `es/es` yet. Do a first rollout via AEM UI (Tools → MSM → select blueprint `/content/adkstvite/us/en` → Rollout to `fr/fr` and `es/es`).
- [ ] **Localized XF variations**: header/footer XFs only exist under `/content/experience-fragments/adkstvite/us/en`. For French/Spanish header/footer, create `/content/experience-fragments/adkstvite/fr/fr/site/{header,footer}/master` and `/content/experience-fragments/adkstvite/es/es/site/{header,footer}/master`. The template's `fragmentVariationPath` currently hardcodes `us/en` — revisit to use Core Components v2 localization-aware resolution or per-locale policy overrides.
- [ ] **`cq:ignoreRollout` fields**: per §14 plan (price, currency, stock). Apply on the blueprint pages once commerce fields exist.
- [ ] **Language Copy + Translation**: wire AEM translation workflow (Microsoft Translator or human) to auto-translate during rollout to `fr` and `es`.
- [ ] **Dispatcher locale routing**: add `Accept-Language` rewrite rules to the dispatcher config so EU visitors land on `fr/fr` or `es/es` automatically.
- [ ] **i18n dictionaries**: `ui.apps/.../apps/adkstvite/i18n/{en,fr,es}.json` for UI strings in form labels and React components that don't come from XFs.

### 28.6 Key Architecture Rules Confirmed

- `editable=true` only on containers in template structure, never leaves.
- Editable containers in template structure must be self-closing — children inside block AEM from generating individual `data-path` overlays.
- XF references in template structure are **not** `editable=true` — they're locked structural elements, which is exactly what you want for a shared header/footer.
- Live Copy mixins (`cq:LiveRelationship`, `cq:LiveSyncConfig`) must be on the `jcr:content` node of the page, with `cq:master` as a direct property there.
- `cq:RolloutConfig` must live on the `jcr:content` of a `cq:Page`, not directly under a folder.
