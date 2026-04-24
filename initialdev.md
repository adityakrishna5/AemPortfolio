# Initial Development Log

## Project: adkstvite — AEM Traditional + Vite + React

---

## 1. Webpack → Vite Migration

**What changed:**

- Replaced `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js` with `vite.config.ts`
- Replaced webpack devDependencies (14 packages removed):
  - `webpack`, `webpack-cli`, `webpack-dev-server`, `webpack-merge`
  - `ts-loader`, `css-loader`, `sass-loader`, `style-loader`, `postcss-loader`, `source-map-loader`
  - `mini-css-extract-plugin`, `css-minimizer-webpack-plugin`, `terser-webpack-plugin`, `html-webpack-plugin`
  - `clean-webpack-plugin`, `copy-webpack-plugin`, `eslint-webpack-plugin`, `glob-import-loader`
  - `tsconfig-paths-webpack-plugin`, `sass-glob-importer`
- Added Vite dependencies: `vite`, `@aem-vite/vite-aem-plugin`, `@vitejs/plugin-react`, `vite-tsconfig-paths`
- `minify` changed from `terser` → `esbuild` (terser was a transitive dep that was removed)

**`vite.config.ts` key config:**

```
base:            /etc.clientlibs/adkstvite/clientlibs/
build.outDir:    dist
rollupOptions.input:
  bundle  → src/main/webpack/site/main.ts
  styles  → src/main/webpack/site/main.scss
  tailwind → src/main/webpack/site/tailwind.css   (added in Tailwind step)
output:
  JS      → clientlib-site/resources/js/[name].js
  CSS     → clientlib-site/resources/css/[name].css
  chunks  → clientlib-site/resources/chunks/[name].[hash].js
  static  → clientlib-site/resources/static/[name].[hash][ext]
```

**Build scripts (unchanged):**

```
npm run dev   → vite build --mode development && clientlib --verbose
npm run prod  → vite build && clientlib --verbose
npm run start → vite serve
```

---

## 2. Tailwind CSS v4 Integration

**Packages added:**

```
tailwindcss          ^4.2.4
@tailwindcss/vite    ^4.2.4
```

**Files changed / created:**

| File                                             | Change                                                                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui.frontend/vite.config.ts`                     | Added `import tailwindcss from '@tailwindcss/vite'` + `tailwindcss()` as first plugin + `tailwind` rollup input                                 |
| `ui.frontend/src/main/webpack/site/tailwind.css` | **New** — Tailwind v4 entry with `@import "tailwindcss"` + brand theme (`--color-uhc-blue`, `--color-uhc-blue-light`, `--color-uhc-gold`, etc.) |
| `ui.frontend/src/main/webpack/site/main.ts`      | Added `.tsx` to `import.meta.glob` patterns                                                                                                     |

**Tailwind CSS output:** `dist/clientlib-site/resources/css/tailwind.css` → picked up by `aem-clientlib-generator` → served as part of `adkstvite.site` clientlib.

**Brand colors defined in `tailwind.css`:**

```css
--color-uhc-blue: #002677 (primary blue) --color-uhc-blue-light: #196ecf
  (hover/link blue) --color-uhc-gold: #f5a623 (accent gold)
  --color-uhc-gray: #f5f5f5 (section backgrounds) --color-uhc-text: #1a1a1a
  (body text);
```

---

## 3. AEM Templates — Public Page & Private Page

### 3a. Public Page Template

**Path:** `/conf/adkstvite/settings/wcm/templates/public-page`

**Purpose:** Homepage, Find Care, FAQ — no authentication required.

**Files created:**

| File                     | Purpose                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `.content.xml`           | Template definition, status=enabled                             |
| `structure/.content.xml` | Locked structure: header XF + 3 editable containers + footer XF |
| `policies/.content.xml`  | Component policy mappings for each container                    |
| `initial/.content.xml`   | Default content scaffolded when page is created                 |

**Page structure (locked + editable):**

```
root (container, responsiveGrid)
├── experiencefragment-header  [LOCKED] → /content/experience-fragments/.../site/header/master
├── hero-container             [EDITABLE]
├── quick-links-container      [EDITABLE]
├── forms-faq-container        [EDITABLE]
└── experiencefragment-footer  [LOCKED] → /content/experience-fragments/.../site/footer/master
```

### 3b. Private Page Template

**Path:** `/conf/adkstvite/settings/wcm/templates/private-page`

**Purpose:** Member dashboard, Claims, Benefits — requires Auth0 sign-in.

**Files created:** same 4-file structure.

**Page structure:**

```
root (container, responsiveGrid)
├── experiencefragment-header  [LOCKED] → /content/experience-fragments/.../site/member-header/master
├── member-nav-container       [EDITABLE]
├── main-content-container     [EDITABLE]
└── experiencefragment-footer  [LOCKED]
```

**Note:** `member-header` XF does not exist yet — needs to be authored in AEM after deploy.

---

## 4. AEM Page Component Variants

| Component      | Path                                          | Super-type                  |
| -------------- | --------------------------------------------- | --------------------------- |
| `public-page`  | `apps/adkstvite/components/page/public-page`  | `adkstvite/components/page` |
| `private-page` | `apps/adkstvite/components/page/private-page` | `adkstvite/components/page` |

**`private-page/customheaderlibs.html`** injects two meta tags read by frontend JS:

```html
<meta name="adkstvite:page-type" content="private" />
<meta name="adkstvite:auth-required" content="true" />
```

The `PrivateHeader.tsx` will read these tags to trigger Auth0 redirect when no token exists.

---

## 5. React Components (ui.frontend)

**Location:** `src/main/webpack/components/homepage/`

| File                 | Description                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| `Hero.tsx`           | Sign-in hero banner with headline, subheadline, Sign In + Register CTAs                |
| `QuickLinkCard.tsx`  | Single card: icon + title + description + link                                         |
| `QuickLinksGrid.tsx` | 4-col responsive grid of QuickLinkCards (Find Provider/Dentist/Vision/Pharmacy)        |
| `SiteHeader.tsx`     | Public sticky header: logo, nav links, Sign In CTA, language toggle, mobile menu       |
| `PrivateHeader.tsx`  | Authenticated sticky header: logo, member nav, member name/plan, Sign Out, mobile menu |
| `mount.tsx`          | DOMContentLoaded mount entry — mounts components to AEM-rendered `div#id` elements     |

**Mount pattern:**

```
AEM HTL/text component renders:  <div id="homepage-hero"></div>
mount.tsx finds element:         document.getElementById('homepage-hero')
React renders into it:           createRoot(el).render(<Hero />)
```

**IDs used:**

- `#site-header` → `<SiteHeader />`
- `#member-header` → `<PrivateHeader />`
- `#homepage-hero` → `<Hero />`
- `#homepage-quick-links` → `<QuickLinksGrid />`

---

## 6. Homepage Content Node

**Path:** `/content/adkstvite/us/en/home`

**Template:** `/conf/adkstvite/settings/wcm/templates/public-page`

**Resource type:** `adkstvite/components/page/public-page`

Includes mount-point text components pre-populated with:

- `<div id="homepage-hero"></div>`
- `<div id="homepage-quick-links"></div>`

---

## 7. Build Verification

After all changes, run:

```bash
cd ui.frontend && npm run prod
# then
mvn clean install -PautoInstallSinglePackage
```

**Expected output:**

- `dist/clientlib-site/resources/css/styles.css` — existing SCSS
- `dist/clientlib-site/resources/css/tailwind.css` — Tailwind utility classes
- `dist/clientlib-site/resources/js/bundle.js` — React app + homepage components
- All 11 Maven modules: BUILD SUCCESS

---

## 8. Next Steps

1. **Author `member-header` XF** in AEM Sites → Experience Fragments → adkstvite → us → en → site
2. **Add components to editable containers** via AEM Page Editor on the homepage
3. **Wire Auth0** — install `@auth0/auth0-react`, update `PrivateHeader.tsx` to use `useAuth0` hook
4. **Create member-home page** using `private-page` template at `/content/adkstvite/us/en/member-home`
5. **Add Forms + FAQ section** React components for the `forms-faq-container`
