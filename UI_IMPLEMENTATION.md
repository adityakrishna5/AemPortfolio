# UI Implementation — Components, Sling Models, Styles & Bundling

## Architecture Overview

This project uses a **React Island** pattern inside AEM Traditional. Each AEM component is a thin HTML shell (`div`) rendered by HTL; React mounts inside it on the client. All authored content flows from AEM's JCR through a Sling Model → HTL → `data-*` attributes → React props.

```
Author edits component in AEM dialog
         │
         ▼
JCR node (properties stored under /content/...)
         │  (Sling Model reads via @ValueMapValue)
         ▼
Sling Model (Java)
         │  (HTL template binds model)
         ▼
HTL template → renders <div id="travel-hero" data-headline="..." ...>
         │
         ▼  (browser loads page)
mount.tsx reads dataset.* from the div
         │
         ▼
React component renders using those values as initial props
```

---

## Component Group

All travel components use `componentGroup="Travel"` in their `.content.xml`. This makes them appear together in the AEM component browser under the **Travel** group when an author edits a page that allows them in its policy.

The `page` component uses `componentGroup=".hidden"` — the `.` prefix convention hides it from the component browser (it's a page type, not a drag-drop component).

---

## AEM Components (`ui.apps`)

Located at: `ui.apps/src/main/content/jcr_root/apps/adkstvite/components/`

Each travel component folder contains two files:

| File           | Purpose                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| `.content.xml` | Declares `jcr:primaryType="cq:Component"`, `jcr:title`, `jcr:description`, `componentGroup` |
| `<name>.html`  | HTL template — instantiates the Sling Model and renders the React mount div                 |

### Travel Components

| Component folder       | AEM title             | React component            |
| ---------------------- | --------------------- | -------------------------- |
| `travel-header/`       | Travel Header         | `TravelHeader.tsx`         |
| `travel-hero/`         | Travel Hero           | `TravelHero.tsx`           |
| `travel-about/`        | Travel About          | `TravelAbout.tsx`          |
| `travel-destinations/` | Featured Destinations | `FeaturedDestinations.tsx` |
| `travel-footer/`       | Travel Footer         | `TravelFooter.tsx`         |
| `travel-signin/`       | Travel Sign In        | `SignInForm.tsx`           |
| `travel-register/`     | Travel Register       | `RegisterForm.tsx`         |
| `travel-account/`      | Travel Account        | `AccountPage.tsx`          |

### Page Component

`components/page/` — extends `core/wcm/components/page/v3/page` via `sling:resourceSuperType`. Provides two override HTL partials:

- **`customheaderlibs.html`** — injected into `<head>`. Loads CSS clientlibs (`adkstvite.base` + `adkstvite.site`) using AEM Vite's clientlib template which generates correct `<link>` tags in production and Vite HMR `<script>` tags in dev.
- **`customfooterlibs.html`** — injected before `</body>`. Loads JS clientlibs (`adkstvite.base` async + `adkstvite.site` as ES module).

```html
<!-- customheaderlibs.html (CSS) -->
<sly data-sly-call="${clientlib.css @ categories='adkstvite.base'}" />
<!-- WCM Core CSS -->
<sly data-sly-call="${clientlib.css @ categories='adkstvite.site'}" />
<!-- Vite-built CSS -->

<!-- customfooterlibs.html (JS) -->
<sly
  data-sly-call="${clientlib.js @ categories='adkstvite.base', async=true}"
/>
<!-- WCM Core JS -->
<sly
  data-sly-call="${clientlib.js @ categories='adkstvite.site', esModule=true}"
/>
<!-- Vite bundle -->
```

The `esModule=true` attribute on the site JS tells the AEM Vite clientlib template to emit `<script type="module">`, which is required for the Vite-built bundle that uses ES module syntax.

---

## Sling Models (`core`)

Located at: `core/src/main/java/com/adkstvite/core/models/travel/`

All travel Sling Models follow the same pattern:

```java
@Model(adaptables = Resource.class, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelHeroModel {
    @ValueMapValue private String headline;   // reads JCR property "headline"
    // getters with fallback defaults...
}
```

`@ValueMapValue` reads the property from the component's JCR node. `DefaultInjectionStrategy.OPTIONAL` means missing properties don't cause injection failure — the getter returns a hardcoded default instead.

### Model Summary

| Model                     | `adaptables`                          | What it does                                                                       |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| `TravelHeaderModel`       | `{SlingHttpServletRequest, Resource}` | Reads nav items from child nodes, decodes `adv_access_token` cookie for auth state |
| `TravelHeroModel`         | `Resource`                            | Hero image, badge, headline, subheadline, two CTAs                                 |
| `TravelAboutModel`        | `Resource`                            | About image, overline, headline, two paragraphs, three stats                       |
| `TravelDestinationsModel` | `Resource`                            | Destination cards from `destinations/` child nodes                                 |
| `TravelFooterModel`       | `Resource`                            | Brand info, quick links, top destinations from child nodes                         |
| `TravelSignInModel`       | `Resource`                            | Heading and description text                                                       |
| `TravelRegisterModel`     | `Resource`                            | Heading and description text                                                       |

`TravelHeaderModel` is the only model adapted from `SlingHttpServletRequest` (in addition to `Resource`) because it needs to read cookies from the incoming HTTP request for server-side auth state.

### HTL→React data flow example (TravelHero)

```
JCR: /content/adkstvite/us/en/home/jcr:content/root/container/hero
     headline = "Discover Your"
         │
         ▼
TravelHeroModel.getHeadline() → "Discover Your"
         │
         ▼
travel-hero.html: data-headline="${model.headline @ context='attribute'}"
         │  renders as:
         ▼
<div id="travel-hero" data-headline="Discover Your" ...>
         │
         ▼
mount.tsx: root.render(<TravelHero headline={d.headline} .../>)
         │
         ▼
TravelHero.tsx displays "Discover Your" in the hero section
```

---

## SCSS Structure (`ui.frontend`)

Located at: `ui.frontend/src/main/webpack/`

### Entry point: `site/main.scss`

This is the single SCSS entry file compiled by Vite. It imports everything in order:

```
main.scss
 ├── _variables.scss          ← design tokens (colors, fonts, sizes)
 ├── _base.scss               ← html/body/a/button resets using the tokens
 ├── components/_accordion.scss
 ├── components/_breadcrumb.scss
 ├── ... (one file per WCM Core component)
 ├── components/_title.scss
 ├── site/styles/container_main.scss      ← main container layout
 ├── site/styles/experiencefragment_footer.scss  ← XF footer styling
 ├── site/styles/experiencefragment_header.scss  ← XF header styling
 ├── site/styles/travel_layout.scss       ← travel page full-width overrides
 └── site/styles/travel_content.scss      ← rich text + image content styling
```

### SCSS file purposes

| File                                         | Purpose                                                                                                                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site/_variables.scss`                       | Design tokens — font family/size/height, foreground/background/link colors, dark mode via `invert()`                                                                                                                                                 |
| `site/_base.scss`                            | Global resets — `html`, `body`, `a`, `button`, `input` base styles using tokens                                                                                                                                                                      |
| `components/_*.scss`                         | One file per WCM Core component. Prefixed with `_` so Sass treats them as partials (not compiled standalone).                                                                                                                                        |
| `site/styles/travel_layout.scss`             | Strips AEM responsive grid padding/margins (`aem-Grid`, `aem-GridColumn`, `cmp-container`) for travel pages using `body.travel-page`. Makes React sections render full-width. Sets `min-height:100vh` flex-column so footer is always at the bottom. |
| `site/styles/travel_content.scss`            | Styles AEM core `Text` (`.cmp-text`) and `Image` (`.cmp-image`) components when used inside travel pages. Applies branded typography (stone-200 text, stone-50 headings, amber links).                                                               |
| `site/styles/container_main.scss`            | Styles the main editable container region.                                                                                                                                                                                                           |
| `site/styles/experiencefragment_header.scss` | Styles the Experience Fragment used as the header (border-bottom, dark mode support).                                                                                                                                                                |
| `site/styles/experiencefragment_footer.scss` | Styles the Experience Fragment used as the footer.                                                                                                                                                                                                   |

### Tailwind CSS

`site/tailwind.css` is a **separate entry point**:

```css
@import "tailwindcss";

@theme {
  --font-family-sans: "Arial", "Helvetica Neue", sans-serif;
}
```

The `@tailwindcss/vite` plugin processes this at build time and generates a **separate `tailwind.css` output file** containing only the utility classes actually used across all TSX/HTML files (purged automatically). Travel React components use Tailwind utility classes exclusively — they do not use any SCSS.

---

## Clientlib Structure (`ui.apps`)

Located at: `ui.apps/src/main/content/jcr_root/apps/adkstvite/clientlibs/`

AEM serves frontend assets through **Client Library Folders** (`cq:ClientLibraryFolder`). The build pipeline copies Vite output into these folders.

### `clientlib-base` — category `adkstvite.base`

```xml
embed="[core.wcm.components.accordion.v1, core.wcm.components.tabs.v1, ... , adkstvite.grid]"
```

Embeds all WCM Core component clientlibs into a single library. Loaded on every page. Contains **no custom code** — it is purely an embed aggregator so the browser gets all Core Component JS/CSS in one request.

### `clientlib-site` — category `adkstvite.site`

The main custom clientlib. Points to Vite build output:

| File pointer                   | Source                    | Content                                            |
| ------------------------------ | ------------------------- | -------------------------------------------------- |
| `css.txt` → `css/styles.css`   | Vite compiles `main.scss` | All component SCSS + site SCSS                     |
| `css.txt` → `css/tailwind.css` | `@tailwindcss/vite`       | Purged Tailwind utilities used by React components |
| `js.txt` → `js/bundle.js`      | Vite bundles `main.ts`    | All React components + mount logic                 |

Flags on this clientlib:

- `allowProxy=true` — served via `/etc.clientlibs/adkstvite/...` (safe for publish, bypasses `/apps` access restriction)
- `esModule=true` — tells AEM to emit `<script type="module">` tag

### `clientlib-dependencies` and `clientlib-grid`

Standard archetype-generated clientlibs. `clientlib-grid` contains the AEM responsive grid CSS (`grid.css`). `clientlib-dependencies` aggregates third-party dependencies.

---

## Vite Build Pipeline (`ui.frontend`)

### Entry points (`vite.config.ts`)

```ts
rollupOptions: {
  input: {
    bundle:   'src/main/webpack/site/main.ts',    // → clientlib-site/resources/js/bundle.js
    styles:   'src/main/webpack/site/main.scss',  // → clientlib-site/resources/css/styles.css
    tailwind: 'src/main/webpack/site/tailwind.css'// → clientlib-site/resources/css/tailwind.css
  }
}
```

Three explicit entry points produce three separate output artifacts. Rollup handles JS/TS, the Vite SCSS plugin handles `.scss`, and `@tailwindcss/vite` handles Tailwind.

### Output paths

```
dist/
└── clientlib-site/
    ├── resources/
    │   ├── js/
    │   │   └── bundle.js           ← all React + mount (ES module)
    │   ├── css/
    │   │   ├── styles.css          ← compiled SCSS
    │   │   └── tailwind.css        ← purged Tailwind
    │   ├── chunks/
    │   │   └── *.hash.js           ← code-split chunks (if any)
    │   └── static/
    │       └── *.hash.*            ← hashed static assets
```

### `clientlib.config.js` — syncing dist → ui.apps

After Vite builds to `dist/`, the `aem-clientlib-generator` tool (configured in `clientlib.config.js`) copies the output into `ui.apps/src/main/content/jcr_root/apps/adkstvite/clientlibs/clientlib-site/`, overwriting:

- `css/` → files listed in `css.txt`
- `js/` → files listed in `js.txt`
- `resources/chunks/`, `resources/static/` → additional assets

This is what `mvn clean install` triggers via the `frontend-maven-plugin` build phase.

### `@aem-vite/vite-aem-plugin`

Plugged into Vite, this plugin:

1. **Build mode**: rewrites asset URLs from relative paths to `/etc.clientlibs/adkstvite/clientlibs/clientlib-site/resources/...` absolute AEM paths.
2. **Dev mode**: serves the Vite HMR dev server and injects a small runtime shim that patches `<link>` and `<script>` tags on the AEM author/publish page to point at `localhost:3000` instead of `/etc.clientlibs/...`, giving hot-reload without a full Maven build.

### Plugins summary

| Plugin                      | Role                                                  |
| --------------------------- | ----------------------------------------------------- |
| `@vitejs/plugin-react`      | JSX/TSX transform, React Fast Refresh in dev          |
| `@tailwindcss/vite`         | Scans TSX files, generates purged Tailwind output     |
| `vite-tsconfig-paths`       | Resolves TypeScript path aliases from `tsconfig.json` |
| `@aem-vite/vite-aem-plugin` | AEM clientlib URL rewriting + dev proxy shim          |

---

## End-to-End Flow: page load in production

```
1. Browser requests /content/adkstvite/us/en/home.html

2. AEM Publish (or Dispatcher cache hit) returns HTML:
   <head>
     <!-- customheaderlibs.html output -->
     <link rel="stylesheet" href="/etc.clientlibs/adkstvite/clientlibs/clientlib-site/resources/css/styles.css">
     <link rel="stylesheet" href="/etc.clientlibs/adkstvite/clientlibs/clientlib-site/resources/css/tailwind.css">
   </head>
   <body>
     <!-- travel-header component rendered by HTL + TravelHeaderModel -->
     <div id="travel-header" data-brand-name="AdventureTrails" data-is-authenticated="true" data-display-name="John">
     </div>

     <!-- travel-hero component -->
     <div id="travel-hero" data-headline="Discover Your" data-headline-accent="Next Adventure" ...>
     </div>

     ... other components ...

     <!-- customfooterlibs.html output -->
     <script type="module" src="/etc.clientlibs/adkstvite/clientlibs/clientlib-site/resources/js/bundle.js">
     </script>
   </body>

3. Browser downloads and parses CSS (styles.css + tailwind.css) → page styled

4. Browser downloads bundle.js (ES module, type="module")
   → main.ts executes
   → import.meta.glob eagerly imports all .ts/.tsx files including mount.tsx
   → mount.tsx runs: finds all component divs by id, calls createRoot().render()

5. For each component div:
   mount.tsx reads div.dataset.* → passes as props → React renders component

   TravelHeader: isAuthenticatedInitial="true" → shows user name + Sign Out immediately
   TravelHero:   headline="Discover Your" → renders hero section

6. React is now interactive — no page reload needed for user interactions
```

## End-to-End Flow: Vite dev mode

```
1. AEM author/publish runs at localhost:4502 / localhost:4503
2. Developer runs: cd ui.frontend && npx vite (or npm run dev)
   → Vite dev server starts at localhost:3000
   → @aem-vite plugin patches <link>/<script> on the AEM page to point to localhost:3000
   → HMR websocket connects

3. Developer edits TravelHero.tsx
   → Vite recompiles in ~ms
   → HMR pushes the update to the browser
   → React Fast Refresh updates just the TravelHero component without a full reload
   → AEM dialog authored data in data-* attributes is preserved

4. Auth fetch calls (/bin/adkstvite/auth/*) hit the Vite proxy → forwarded to localhost:4503
```

---

## Header & Footer Implementation

The header and footer are **not placed directly on each page**. They live inside **Experience Fragments** (XFs) — standalone AEM pages under `/content/experience-fragments/` that get included by reference into every content page. This means an author edits the header or footer in one place and the change propagates everywhere instantly.

### Why Experience Fragments?

| Approach                       | What it means                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Component on every page        | Each page stores its own copy — editing means touching every page                                        |
| XF include (this project)      | One XF node per locale. Edit once → all pages reflect changes immediately                                |
| Template-locked (not editable) | Header/footer come from template structure and cannot be moved or deleted by authors on individual pages |

### JCR location

```
/content/experience-fragments/adkstvite/
├── us/en/site/
│   ├── header/master/   ← US-English header XF
│   └── footer/master/   ← US-English footer XF
├── es/…/                ← Spanish locale header/footer
└── fr/…/                ← French locale header/footer
```

Each `master` node is a `cq:Page` with `cq:xfMasterVariation=true` and `cq:xfVariantType=web`. The XF variation type `web` means it renders as a plain HTML fragment (no full page shell) when included.

### Header XF content (`us/en/site/header/master`)

The header XF contains a single `travel-header` component:

```xml
<header-mount
    sling:resourceType="adkstvite/components/travel-header"
    brandName="AdventureTrails"
    brandHref="/content/adkstvite/us/en/home.html"
    signInLabel="Sign In"
    signInHref="/content/adkstvite/us/en/sign-in.html"
    registerLabel="Register"
    registerHref="/content/adkstvite/us/en/register.html">
  <navItems>
    <item0 label="Home"     href="/content/adkstvite/us/en/home.html"/>
    <item1 label="About Us" href="/content/adkstvite/us/en/about-us.html"/>
  </navItems>
</header-mount>
```

These authored properties are read by `TravelHeaderModel` via `@ValueMapValue` and become `data-*` attributes on the React mount div.

### Footer XF content (`us/en/site/footer/master`)

The footer XF contains a single `travel-footer` component:

```xml
<footer-mount
    sling:resourceType="adkstvite/components/travel-footer"
    brandName="AdventureTrails"
    tagline="Connecting adventurers …">
  <quickLinks>
    <item0 label="Home"     href="…"/>
    <item1 label="About Us" href="…"/>
    …
  </quickLinks>
  <topDestinations>
    <item0 label="Arctic Surfing, Norway" href="…"/>
    …
  </topDestinations>
</footer-mount>
```

### How the XF is included on pages

The travel-page template structure (`structure/.content.xml`) locks two XF slots into the top and bottom of the responsive grid:

```xml
<root layout="responsiveGrid">
  <!-- LOCKED — authors cannot remove or reorder -->
  <header-xf  sling:resourceType="adkstvite/components/experiencefragment"
              fragmentVariationPath="/content/experience-fragments/adkstvite/us/en/site/header/master"/>

  <!-- EDITABLE — authors place page-specific components here -->
  <main-content sling:resourceType="adkstvite/components/container" editable="{Boolean}true"/>

  <!-- LOCKED -->
  <footer-xf  sling:resourceType="adkstvite/components/experiencefragment"
              fragmentVariationPath="/content/experience-fragments/adkstvite/us/en/site/footer/master"/>
</root>
```

Because these nodes come from the template `structure` (not the page's own `initial` content), AEM marks them as locked — they cannot be deleted or repositioned by authors in the page editor.

### TravelHeaderModel — server-side auth state

`TravelHeaderModel` is adapted from both `SlingHttpServletRequest` and `Resource` because it needs access to cookies in addition to the authored properties. Its `@PostConstruct init()` does two things:

1. **Auth resolution** — reads the `adv_access_token` cookie, Base64url-decodes the JWT payload (middle segment), extracts `name`/`nickname`/`email`, and checks the `exp` claim. Sets `authenticated=true` and `displayName` if valid.
2. **Nav items JSON** — iterates over `navItems/*` child nodes from the authored JCR structure and serialises them as a JSON array string for the `data-nav-items` attribute.

```
Request arrives with adv_access_token cookie
           │
           ▼
TravelHeaderModel.init()
  ├── decodeJwt(cookie)
  │     ├── split JWT → payload segment
  │     ├── Base64url decode → JSON string
  │     ├── extract "exp" → check not expired
  │     └── extract "name" / "nickname" / "email"
  │           → authenticated = true, displayName = "John"
  └── iterate navItems/* children → navItemsJson = "[{...},{...}]"
           │
           ▼
travel-header.html renders:
  <div id="travel-header"
       data-is-authenticated="true"
       data-display-name="John"
       data-nav-items="[{&quot;label&quot;:&quot;Home&quot;,…}]"
       …>
```

React receives `isAuthenticatedInitial=true` and renders the user's name straightaway — no loading flash, no client-side JWT decode.

### TravelFooterModel — child node iteration

`TravelFooterModel` uses the same child-node pattern for two lists (`quickLinks` and `topDestinations`). Both are iterated in `@PostConstruct`, serialised as JSON arrays, and exposed via `getQuickLinksJson()` / `getTopDestinationsJson()`. Hardcoded defaults are used if no children are authored.

```
travel-footer.html renders:
  <div id="travel-footer"
       data-quick-links="[{…},{…}]"
       data-top-destinations="[{…},{…}]"
       …>
```

---

## Templates

Located at: `ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/`

AEM Editable Templates are stored under `/conf/adkstvite/` and define the fixed structure, initial content, and component policies for pages. They appear in the author's "Create Page" wizard. Only users with Template Editor permissions can modify them.

### Available templates

| Template node      | Title                 | Purpose                                                                                                                      |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `travel-page`      | Travel Page           | Main content pages — header/footer locked, main content editable. Travel components allowed in the `main-content` container. |
| `public-page`      | Public Page           | Unauthenticated visitor pages (e.g. homepage, FAQ). Broader component set.                                                   |
| `private-page`     | Private Page (Member) | Authenticated-only pages (e.g. dashboard). Same structure but the page renderer enforces auth.                               |
| `page-content`     | Content Page          | Generic archetype-default page.                                                                                              |
| `xf-web-variation` | XF Web Variation      | Used by the Experience Fragment pages for header and footer.                                                                 |

### Template anatomy

Every editable template has four sub-nodes:

```
travel-page/
├── .content.xml    ← template metadata: title, description, status, templateType
├── structure/      ← locked layout: grid nodes visible to all pages but not editable
├── initial/        ← starting content copied into each new page on creation
└── policies/       ← maps each container/slot to a component policy
```

**`structure/`** defines what all pages see and cannot change. `header-xf` and `footer-xf` live here — that's why authors cannot delete them.

**`initial/`** defines what a newly created page starts with. For `travel-page`, only the `main-content` container is copied (the header/footer are inherited from `structure/`, not duplicated):

```xml
<root>
  <main-content
      sling:resourceType="adkstvite/components/container"
      layout="responsiveGrid"/>
</root>
```

**`policies/`** maps each slot/container to a named policy. A policy controls which components are allowed in that slot:

```xml
<root    cq:policy="adkstvite/components/container/policy_travel_only">
  <header-xf      cq:policy="adkstvite/components/experiencefragment/policy_header"/>
  <main-content   cq:policy="adkstvite/components/container/policy_travel_only"/>
  <footer-xf      cq:policy="adkstvite/components/experiencefragment/policy_footer"/>
</root>
```

`policy_travel_only` allows only Travel-group components in the main content area. The XF slot policies (`policy_header`, `policy_footer`) restrict what can be placed inside those locked containers.

### How a new page gets the header and footer

```
Author clicks "Create Page" → selects "Travel Page" template
         │
         ▼
AEM creates /content/adkstvite/us/en/my-new-page
  copies initial/ → page gets empty main-content container
         │
         ▼
When the page is rendered, AEM merges:
  template structure/ nodes (header-xf, footer-xf) +
  page's own content (main-content with authored components)
         │
         ▼
Sling renders header-xf node:
  → resolves sling:resourceType=adkstvite/components/experiencefragment
  → includes the XF at fragmentVariationPath
  → XF renders travel-header component
  → TravelHeaderModel fires, reads cookie, builds nav JSON
  → <div id="travel-header" data-*="…"> emitted into page HTML
         │
         ▼
Same for footer-xf at the bottom
         │
         ▼
React bundle loads, mounts TravelHeader + TravelFooter into those divs
```

### Editing the header or footer

Authors go to **AEM Sites → Experience Fragments → adkstvite → us → en → site → header/footer → master**. They can change `brandName`, add/remove nav items via AEM dialog, or update footer links — no code change required. The updated XF is immediately live on all pages that include it (because the XF is included by reference, not copied).

Changing the header navigation for a different locale (e.g. French) means editing `fr/…/site/header/master` independently — same React component, different authored data.

### Template type (`/conf/adkstvite/settings/wcm/template-types/`)

Template types define the base page `sling:resourceType` used by all templates of that type. The `page` template type maps to `adkstvite/components/page/travel-page`, which inherits from `core/wcm/components/page/v3/page` and provides the `customheaderlibs.html` / `customfooterlibs.html` overrides. The `xf` template type maps to `adkstvite/components/xfpage` for Experience Fragment pages.
