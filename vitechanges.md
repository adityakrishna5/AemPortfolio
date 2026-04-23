# AEM Vite Migration Changes

Migration from **webpack** (AEM Maven Archetype default) to **Vite** with **React** support.
Reference: https://www.aemvite.dev/guide/

---

## Table of Contents

1. [ui.frontend — New Files](#1-uifrontend--new-files)
2. [ui.frontend — Modified Files](#2-uifrontend--modified-files)
3. [ui.apps — Modified Files](#3-uiapps--modified-files)
4. [ui.apps — New Files](#4-uiapps--new-files)
5. [all — Modified Files](#5-all--modified-files)
6. [Output Structure](#6-output-structure)
7. [npm Scripts](#7-npm-scripts)
8. [Build Fixes — April 23 2026](#8-build-fixes--april-23-2026)

---

## 1. ui.frontend — New Files

### `vite.config.ts` _(new — replaces webpack.common.js / webpack.dev.js / webpack.prod.js)_

```ts
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { viteForAem } from "@aem-vite/vite-aem-plugin";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => ({
  base: command === "build" ? "/etc.clientlibs/adkstvite/clientlibs/" : "/",
  publicDir: command === "build" ? false : "src/main/webpack/static",

  build: {
    reportCompressedSize: false,
    manifest: false,
    minify: mode === "development" ? false : "terser",
    outDir: "dist",
    sourcemap: command === "serve" ? "inline" : false,
    assetsDir: "clientlib-site/resources/static",

    rollupOptions: {
      input: {
        bundle: "src/main/webpack/site/main.ts",
        styles: "src/main/webpack/site/main.scss",
      },
      output: {
        assetFileNames: (chunk) =>
          chunk.name?.endsWith(".css")
            ? "clientlib-site/resources/css/[name][extname]"
            : "clientlib-site/resources/static/[name].[hash][extname]",
        chunkFileNames: "clientlib-site/resources/chunks/[name].[hash].js",
        entryFileNames: "clientlib-site/resources/js/[name].js",
      },
    },
  },

  plugins: [
    react(),
    tsconfigPaths(),
    viteForAem({
      contentPaths: ["adkstvite"],
      publicPath: "/etc.clientlibs/adkstvite/clientlibs/clientlib-site",
      rewriterOptions: {
        resourcesPath: "resources/js",
      },
    }),
  ],

  server: {
    port: 3000,
    origin: "http://localhost:3000",
  },
}));
```

#### Config option breakdown

| Option                                                      | Value                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `base`                                                      | `/etc.clientlibs/adkstvite/clientlibs/` on build, `/` on serve | AEM serves all clientlib static assets through the `/etc.clientlibs` proxy. During DevServer (`serve`), Vite serves from its own origin so base is `/`. Without this, static asset URLs (images, fonts) will 404 in AEM.                                                                                                                                                                                           |
| `publicDir`                                                 | `false` on build, `src/main/webpack/static` on serve           | The `static/` folder holds the dev-only `index.html` used by webpack-dev-server. On build it must be disabled — AEM handles static assets via clientlibs, not a public folder.                                                                                                                                                                                                                                     |
| `reportCompressedSize`                                      | `false`                                                        | Vite by default calculates gzip sizes of every output file. This adds 2–5 seconds to every build with no benefit in an AEM CI environment.                                                                                                                                                                                                                                                                         |
| `manifest`                                                  | `false`                                                        | Vite generates a `manifest.json` for asset hashing with SSR frameworks. AEM uses its own clientlib versioning (lc= hash), so this file is unused and adds noise.                                                                                                                                                                                                                                                   |
| `minify`                                                    | `false` in dev mode, `'terser'` in prod                        | Allows running `vite build --mode development` to get an unminified bundle for debugging directly in AEM without using the DevServer. Terser is preferred over esbuild for production because it produces smaller output.                                                                                                                                                                                          |
| `sourcemap`                                                 | `'inline'` on serve, `false` on build                          | Inline sourcemaps are needed during DevServer for HMR debugging in the browser. On build they are disabled because AEM would expose sourcemaps publicly via the clientlib proxy.                                                                                                                                                                                                                                   |
| `assetsDir`                                                 | `'clientlib-site/resources/static'`                            | Controls where Vite places assets that are imported via JS (e.g. `import logo from './logo.svg'`). Must be inside `resources/` because AEM's `/etc.clientlibs` proxy only serves files under a `resources` subfolder (AEM 6.4+).                                                                                                                                                                                   |
| `rollupOptions.input`                                       | `bundle` (TS) + `styles` (SCSS)                                | CSS must be declared as a separate explicit entry point. If imported via JS, AEM's clientlib handler may not pick it up correctly as a standalone `<link>` tag. The output keys (`bundle`, `styles`) become the filenames in `resources/js/`.                                                                                                                                                                      |
| `assetFileNames` (function)                                 | CSS → `resources/css/`, everything else → `resources/static/`  | A static string like `resources/[ext]/` would produce folders named `js`, `css`, `png`, etc. Using a function gives explicit control: CSS goes to `resources/css/`, all other assets (images, fonts, SVGs) go to `resources/static/` with a content hash for cache-busting.                                                                                                                                        |
| `chunkFileNames`                                            | `resources/chunks/[name].[hash].js`                            | Code-split chunks (from dynamic `import()`) must live inside `resources/` for AEM's `/etc.clientlibs` proxy to serve them. Without this, lazy-loaded chunks return 404.                                                                                                                                                                                                                                            |
| `entryFileNames`                                            | `resources/js/[name].js`                                       | Entry bundles go into `resources/js/`. The `clientlib.config.js` points `cwd: 'clientlib-site/resources/js'` to pick these up for the AEM clientlib.                                                                                                                                                                                                                                                               |
| `server.port`                                               | `3000`                                                         | Fixes the port so it doesn't auto-increment. AEM Vite enforces strict port mode — if the port changes, the proxy URL embedded in the page would be wrong.                                                                                                                                                                                                                                                          |
| `server.origin`                                             | `http://localhost:3000`                                        | Tells Vite to prefix all asset URLs with this origin during DevServer. Required so that static assets (images imported in JS/CSS) are requested from Vite's server rather than from AEM.                                                                                                                                                                                                                           |
| `react()` **first**                                         | —                                                              | `@vitejs/plugin-react` must be registered before other plugins so it can inject the React Fast Refresh preamble into every page. AEM Vite auto-detects this plugin and enables HMR for React components.                                                                                                                                                                                                           |
| `tsconfigPaths()`                                           | —                                                              | Resolves TypeScript path aliases (from `tsconfig.json` `paths`) in Vite. Replaces `tsconfig-paths-webpack-plugin` from the original webpack config.                                                                                                                                                                                                                                                                |
| `viteForAem({ contentPaths, publicPath, rewriterOptions })` | —                                                              | Core AEM Vite plugin. `contentPaths` tells the DevServer proxy which AEM content paths to intercept (matches `/content/adkstvite/...`). `publicPath` is the full `/etc.clientlibs` path used to rewrite clientlib includes on the page. `rewriterOptions.resourcesPath` tells the import rewriter where JS entry files live so dynamic `import()` paths get rewritten to AEM-friendly `/etc.clientlibs/...` paths. |
| ~~`sassGlobImporter()`~~                                    | ~~removed~~                                                    | Originally added to resolve SCSS glob `@import` patterns. **Removed** — Vite 8's modern Sass compiler no longer accepts the legacy importer API this package uses. Replaced by expanding glob imports into explicit `@import` statements directly in `main.scss` (see Build Fixes section).                                                                                                                        |

---

## 2. ui.frontend — Modified Files

### `package.json` — scripts

| Script  | Old (webpack)                                                        | New (Vite)                                             | Why                                                                                                                 |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `start` | `webpack-dev-server --open --config ./webpack.dev.js`                | `vite serve`                                           | Starts Vite's DevServer which proxies AEM. No webpack needed.                                                       |
| `dev`   | `webpack --env dev --config ./webpack.dev.js && clientlib --verbose` | `vite build --mode development && clientlib --verbose` | Builds an unminified bundle deployable to AEM for debugging without DevServer.                                      |
| `prod`  | `webpack --config ./webpack.prod.js && clientlib --verbose`          | `vite build && clientlib --verbose`                    | Production build with terser minification, then syncs output to `ui.apps` clientlibs via `aem-clientlib-generator`. |

### `package.json` — new devDependencies installed

| Package                             | Why                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `vite`                              | Build tool and DevServer replacing webpack                                                                      |
| `vite-tsconfig-paths`               | Resolves TS `paths` aliases in Vite (replaces `tsconfig-paths-webpack-plugin`)                                  |
| `@aem-vite/vite-aem-plugin`         | Core AEM Vite plugin — provides the AEM proxy, clientlib interceptor, and import rewriter                       |
| ~~`sass-glob-importer`~~            | ~~Enables glob SCSS imports~~ — **removed**, incompatible with Vite 8 modern Sass API (see Build Fixes section) |
| `@vitejs/plugin-react`              | Enables JSX transform and React Fast Refresh HMR                                                                |
| `react` + `react-dom`               | React runtime                                                                                                   |
| `@types/react` + `@types/react-dom` | TypeScript type definitions for React                                                                           |

### `clientlib.config.js`

**What changed:**

- Removed the `clientlib-dependencies` lib entirely. The webpack config split vendor code into a separate `clientlib-dependencies` chunk — Vite handles tree-shaking and code splitting differently (chunks go into `resources/chunks/`) so a separate dependencies clientlib is no longer needed.
- Added `customProperties: ['esModule']` and `esModule: '{Boolean}true'` — instructs `aem-clientlib-generator` to write the `esModule` JCR property into the generated `clientlib-site` node. This is required for AEM Vite's handler to emit `<script type="module">` tags.
- Updated asset `cwd` paths to match Vite's output structure:
  - JS: `clientlib-site/resources/js`
  - CSS: `clientlib-site/resources/css`
  - Resources (images, fonts): `clientlib-site/resources` (excluding JS/CSS)

### `tsconfig.json`

| Option             | Old             | New                                 | Why                                                                                                                                                                       |
| ------------------ | --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`           | `es5`           | `ES2020`                            | Vite targets modern browsers. `es5` would force excessive transpilation and is incompatible with native ES module output.                                                 |
| `module`           | `es6`           | `ESNext`                            | Required for Vite's module bundling. `ESNext` allows dynamic `import()` and other modern module features to pass through to rollup unchanged.                             |
| `moduleResolution` | _(not set)_     | `bundler`                           | New TS resolution strategy designed for bundlers like Vite/rollup. Enables cleaner module imports without needing `.js` extensions.                                       |
| `jsx`              | _(not set)_     | `react-jsx`                         | Enables the React 17+ automatic JSX transform. With this, you do **not** need `import React from 'react'` in every `.tsx` file — the transform is injected automatically. |
| `strict`           | _(not set)_     | `false`                             | Keeps compatibility with existing JS/TS files in the archetype that may not pass strict checks. Can be enabled incrementally.                                             |
| `lib`              | _(not set)_     | `["ES2020", "DOM", "DOM.Iterable"]` | Provides correct type definitions for browser APIs and modern JS (e.g. `Array.prototype.at`, `Promise.allSettled`).                                                       |
| `include`          | `./src/**/*.ts` | `./src/**/*.ts`, `./src/**/*.tsx`   | Added `.tsx` so TypeScript processes React component files.                                                                                                               |

### `src/main/webpack/site/main.ts`

**What changed:** Replaced webpack `glob-import-loader` syntax with Vite's native `import.meta.glob`.

```ts
// Before (webpack glob-import-loader — not supported by Vite)
import "./**/*.js";
import "./**/*.ts";
import "../components/**/*.js";

// After (Vite native glob import)
const siteModules = import.meta.glob(
  ["./**/*.ts", "./**/*.js", "../components/**/*.ts", "../components/**/*.js"],
  { eager: true },
);
```

`{ eager: true }` makes the imports synchronous (same behaviour as the webpack loader). Without `eager`, glob imports are lazy (async) which would change the load order.

### `src/main/webpack/site/main.scss`

**What changed:** Replaced two SCSS glob `@import` patterns with explicit per-file imports.

```scss
/* Before */
@import "variables";
@import "base";
@import "../components/**/*.scss"; /* glob — not supported by Vite 8 Sass */
@import "./styles/*.scss"; /* glob — not supported by Vite 8 Sass */

/* After */
@import "variables";
@import "base";

// Component styles (explicit)
@import "../components/accordion";
@import "../components/breadcrumb";
/* ... all 17 component files ... */
@import "../components/title";

// Site styles (explicit)
@import "./styles/container_main";
@import "./styles/experiencefragment_footer";
@import "./styles/experiencefragment_header";
```

**Why:** `sass-glob-importer` (which made glob `@import` work) uses the Sass legacy importer API. Vite 8 switched to Sass's modern compiler API, which rejects the legacy importer interface with `An importer must have either canonicalize and load methods, or a findFileUrl method`. Since the archetype only has ~27 SCSS files, expanding the globs explicitly is simpler and avoids any runtime dependency.

---

## 3. ui.apps — Modified Files

### `components/page/customheaderlibs.html`

**What changed:** Added a second `<sly>` block using AEM Vite's custom clientlib template for `adkstvite.site` CSS.

```html
<!-- Existing — unchanged, loads adkstvite.base CSS normally -->
<sly
  data-sly-use.clientlib="core/wcm/components/commons/v1/templates/clientlib.html"
>
  <sly data-sly-call="${clientlib.css @ categories='adkstvite.base'}" />
</sly>

<!-- NEW — uses AEM Vite's template for the Vite-built site CSS -->
<sly
  data-sly-use.clientlib="/apps/aem-vite/granite/sightly/templates/clientlib.html"
>
  <sly data-sly-call="${clientlib.css @ categories='adkstvite.site'}" />
</sly>
```

**Why:** AEM Vite installs a custom HTL template at `/apps/aem-vite/granite/sightly/templates/clientlib.html`. This template is what the Vite DevServer intercepts — it strips clientlib `<link>` tags and replaces them with Vite's dev server URLs during HMR. The standard `core/wcm/components` template is bypassed by AEM Vite. Using the wrong template means DevServer mode will not activate.

### `components/page/customfooterlibs.html`

**What changed:** Added a second `<sly>` block using AEM Vite's template for `adkstvite.site` JS with `esModule=true`.

```html
<!-- Existing — unchanged, loads adkstvite.base JS normally -->
<sly
  data-sly-use.clientlib="core/wcm/components/commons/v1/templates/clientlib.html"
>
  <sly
    data-sly-call="${clientlib.js @ categories='adkstvite.base', async=true}"
  />
</sly>

<!-- NEW — uses AEM Vite's template, esModule=true emits <script type="module"> -->
<sly
  data-sly-use.clientlib="/apps/aem-vite/granite/sightly/templates/clientlib.html"
>
  <sly
    data-sly-call="${clientlib.js @ categories='adkstvite.site', esModule=true}"
  />
</sly>
```

**Why:** Vite outputs native ES modules (`import`/`export`). Browsers require `<script type="module">` to load them. Without the `esModule=true` binding, AEM renders a plain `<script src="...">` tag which causes a parse error for ES module syntax. The `esModule` binding tells AEM Vite's template to add the `type="module"` attribute.

### `clientlibs/clientlib-site/.content.xml`

**What changed:** Added `esModule="{Boolean}true"` property.

```xml
<!-- Before -->
<jcr:root ...
    allowProxy="{Boolean}true"
    categories="[adkstvite.site]" />

<!-- After -->
<jcr:root ...
    allowProxy="{Boolean}true"
    categories="[adkstvite.site]"
    esModule="{Boolean}true"/>
```

**Why:** The `esModule` JCR property on the `cq:ClientLibraryFolder` node is read by AEM Vite's backend OSGi service. It instructs the custom clientlib handler to generate `<script type="module">` output for this clientlib. Both this JCR property **and** the HTL `esModule=true` binding are required — they work together.

---

## 4. ui.apps — New Files

### `clientlibs/.content.xml` _(new)_

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="..." xmlns:nt="..." xmlns:rep="internal"
    jcr:mixinTypes="[rep:AccessControllable]"
    jcr:primaryType="nt:folder"/>
```

**Why:** Before applying a `rep:policy` (access control list) to a JCR node, the node must be declared with the `rep:AccessControllable` mixin. Without this file, deploying `_rep_policy.xml` will fail — AEM will refuse to apply the ACL because the parent node is not marked as access-controllable.

### `clientlibs/_rep_policy.xml` _(new)_

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="..." xmlns:rep="internal" jcr:primaryType="rep:ACL">
    <allow
        jcr:primaryType="rep:GrantACE"
        rep:principalName="aem-vite-clientlibs"
        rep:privileges="{Name}[jcr:all]"/>
</jcr:root>
```

**Why:** AEM Vite runs a backend OSGi service under the service user `aem-vite-clientlibs`. When the Vite DevServer is active, this service reads your `clientlib-site` JCR node to understand its structure and intercept matching page requests. Without `jcr:all` access granted here, the service gets a permission-denied error and the proxy never activates, making DevServer mode silently fail.

### `META-INF/vault/nodetypes.cnd` _(new)_

```
<'cq'  = 'http://www.day.com/jcr/cq/1.0'>
<'sling' = 'http://sling.apache.org/jcr/sling/1.0'>
<'nt' = 'http://www.jcp.org/jcr/nt/1.0'>
<'plugin-react' = 'https://react.dev'>

[sling:Folder] > nt:folder
  - * (undefined)
  - * (undefined) multiple
  + * (nt:base) = sling:Folder version
```

**Why:** `@vitejs/plugin-react` follows Vite's [Virtual Modules Convention](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention) and generates internal module IDs containing underscores (e.g. `__vite__/`). When the compiled bundle is packaged by FileVault and installed into AEM, the JCR parser interprets the underscore prefix as a JCR namespace prefix. If `plugin-react` is not declared as a known namespace, AEM throws a `NamespaceException` and the package install fails. This file registers `plugin-react` as a valid namespace to prevent that error.

---

## 5. all — Modified Files

### `pom.xml`

**Added Maven dependency:**

```xml
<dependency>
    <groupId>dev.aemvite</groupId>
    <artifactId>aem-vite.all</artifactId>
    <version>3.0.2</version>
    <type>zip</type>
</dependency>
```

**Why:** Declares the AEM Vite package as a Maven artifact so it can be resolved from Maven Central and embedded into the `all` content package during build.

**Added FileVault embedded:**

```xml
<embedded>
    <groupId>dev.aemvite</groupId>
    <artifactId>aem-vite.all</artifactId>
    <type>zip</type>
    <target>/apps/adkstvite-vendor-packages/application/install</target>
</embedded>
```

**Why:** The Maven dependency alone only downloads the artifact — the `<embedded>` entry tells the `filevault-package-maven-plugin` to bundle the `aem-vite.all` zip inside your `all` content package and install it under `/apps/adkstvite-vendor-packages/application/install` when the package is deployed to AEM. The `vendor-packages` path keeps third-party packages separate from your project packages. Without this, the AEM Vite OSGi bundles (the service user, clientlib handler, HTL templates) would never be installed and nothing would work.

---

## 6. Output Structure

After running `npm run dev` or `npm run prod`, the `dist/` folder will contain:

```
dist/
└── clientlib-site/
    └── resources/
        ├── js/          ← Main entry bundles (bundle.js, styles.js)
        ├── css/         ← CSS assets (styles.css)
        ├── chunks/      ← Code-split chunks from dynamic import()
        └── static/      ← Images, fonts, SVGs (content-hashed filenames)
```

`aem-clientlib-generator` then copies this into `ui.apps`:

```
ui.apps/.../clientlibs/clientlib-site/
├── .content.xml         ← esModule=true
├── js.txt
├── css.txt
└── resources/
    ├── js/
    ├── css/
    ├── chunks/
    └── static/
```

---

## 7. npm Scripts

---

## 8. Build Fixes — April 23 2026

Three distinct errors appeared when running `mvn clean install -PautoInstallSinglePackage` for the first time. Fixed in order:

---

### Fix 1 — `npm ci` ERESOLVE peer dependency conflict

**Where:** `ui.frontend/.npmrc` _(new file)_

**What:**

```
legacy-peer-deps=true
```

**Why:** `npm ci` (used by Maven's `frontend-maven-plugin`) is strict about peer dependency resolution. `vite@8` is installed but `@aem-vite/vite-aem-plugin@5.1.1` declares a peer of `vite@^5||^6||^7`. npm refused to install. The `--legacy-peer-deps` flag (which works at the command line) is not passed by the Maven plugin. Adding it to `.npmrc` in the project folder makes every `npm ci` / `npm install` in that directory use it automatically without changing the Maven plugin config.

---

### Fix 2 — `ReferenceError: CustomEvent is not defined` (Node version too old)

**Where:** Root `pom.xml` — `frontend-maven-plugin` configuration

**What:**

| Property      | Before     | After      |
| ------------- | ---------- | ---------- |
| `nodeVersion` | `v16.17.0` | `v20.19.1` |
| `npmVersion`  | `8.15.0`   | `10.8.2`   |

**Why:** Vite 8 requires Node.js 18 or higher (it uses `CustomEvent`, `fetch`, and other globals that were not available in Node 16). The archetype defaults to Node 16.17.0. `CustomEvent` was added to the Node.js global scope in Node 18. Updated to Node 20 LTS (the current active LTS line) with the matching npm version.

---

### Fix 3 — Sass importer API incompatible with Vite 8

**Where (removed):** `ui.frontend/vite.config.ts` — `css.preprocessorOptions.scss` block removed entirely

**Where (updated):** `ui.frontend/src/main/webpack/site/main.scss` — glob `@import` patterns expanded to explicit imports

**What:** Removed `sass-glob-importer` and the entire `css` config block from `vite.config.ts`. Replaced the two glob `@import` lines in `main.scss` with 20 explicit `@import` statements covering every SCSS file.

**Why:** Vite 8 migrated to the Sass modern compiler API (`compileStringAsync` with `importers` array). The `sass-glob-importer` package implements the **legacy** Sass importer interface (a function returning `{ file }`) which the modern API rejects with:

> `An importer must have either canonicalize and load methods, or a findFileUrl method`

This is a breaking change in Vite 8 / Sass 1.80+. The fix is straightforward for a project with a fixed set of component SCSS files — expand the globs once and maintain the explicit list going forward.

---

### Fix 4 — `_rep_policy.xml` ACL ignored by package validator

**Where:** `ui.apps/pom.xml` — `filevault-package-maven-plugin` configuration

**What:**

```xml
<!-- Before -->
<properties>
    <cloudManagerTarget>none</cloudManagerTarget>
</properties>

<!-- After -->
<properties>
    <cloudManagerTarget>none</cloudManagerTarget>
    <acHandling>merge</acHandling>
</properties>
```

**Why:** FileVault packages default to `acHandling=IGNORE`, which means any `_rep_policy.xml` access control entries in the package are silently discarded on install. The `filevault-package-maven-plugin` validator (v1.3.6+) now treats this as an **error** when the package contains ACL nodes, failing the build with:

> `Found an access control list, but it is never considered during installation as the property 'acHandling' is set to 'IGNORE'`

Setting `acHandling=merge` tells AEM to apply the ACL entries (specifically the `aem-vite-clientlibs` service user grant) while leaving any existing ACEs on the target node intact.

| Command         | What it does                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run start` | Starts Vite DevServer on port 3000, proxies AEM on localhost:4502. Open your AEM page — Vite intercepts clientlib requests and serves bundles with Hot Module Replacement. |
| `npm run dev`   | Builds an unminified bundle (`--mode development`) + runs `clientlib` to sync to `ui.apps`. Use when you want to deploy to AEM without the DevServer.                      |
| `npm run prod`  | Builds a production-minified bundle + syncs to `ui.apps`. Use before `mvn` deploy.                                                                                         |
