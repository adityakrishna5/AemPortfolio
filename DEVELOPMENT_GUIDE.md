# Development Guide — adkstvite

AEM Maven Archetype project with Vite + React frontend.

---

## Table of Contents

1. [Project Modules Overview](#1-project-modules-overview)
2. [Local Development Setup](#2-local-development-setup)
3. [Backend — core/](#3-backend--core)
   - [Sling Models](#31-sling-models)
   - [OSGi Services](#32-osgi-services)
   - [Servlets](#33-servlets)
   - [Filters](#34-filters)
   - [Schedulers](#35-schedulers)
   - [Event Listeners](#36-event-listeners)
   - [OSGi Configurations](#37-osgi-configurations)
4. [Frontend — ui.frontend/](#4-frontend--uifrontend)
   - [SCSS / Global Styles](#41-scss--global-styles)
   - [TypeScript / JavaScript](#42-typescript--javascript)
   - [React Components](#43-react-components)
   - [Static Assets](#44-static-assets)
5. [AEM Components — ui.apps/](#5-aem-components--uiapps)
   - [Custom Components](#51-custom-components)
   - [Sightly / HTL Templates](#52-sightly--htl-templates)
   - [Component Dialogs](#53-component-dialogs)
   - [ClientLibs](#54-clientlibs)
   - [i18n Translations](#55-i18n-translations)
6. [Content — ui.content/](#6-content--uicontent)
7. [OSGi Config — ui.config/](#7-osgi-config--uiconfig)
8. [All Package — all/](#8-all-package--all)
9. [Build & Deploy](#9-build--deploy)
10. [Testing](#10-testing)
11. [Multi-Site Manager (MSM)](#11-multi-site-manager-msm)
    - [Live Copies](#111-live-copies)
    - [Rollout Configs](#112-rollout-configs)
    - [MSM-aware Components](#113-msm-aware-components)
12. [DAM / Assets](#12-dam--assets)
    - [Asset Metadata Schemas](#121-asset-metadata-schemas)
    - [Custom Asset Workflows](#122-custom-asset-workflows)
    - [Renditions & Processing Profiles](#123-renditions--processing-profiles)
    - [Referencing Assets in Components](#124-referencing-assets-in-components)
13. [Workflows](#13-workflows)
    - [Where Workflow Artifacts Live](#131-where-workflow-artifacts-live)
    - [Custom Workflow Process Step](#132-custom-workflow-process-step)
    - [Custom Workflow Participant Step](#133-custom-workflow-participant-step)
    - [Launching a Workflow Programmatically](#134-launching-a-workflow-programmatically)
    - [Workflow Launcher Config](#135-workflow-launcher-config)

---

## 1. Project Modules Overview

```
adkstvite/
├── core/           ← Java: Sling Models, Servlets, Services, Filters, Schedulers
├── ui.frontend/    ← Node.js: Vite + TypeScript + React + SCSS
├── ui.apps/        ← AEM Components, ClientLibs, Dialogs, HTL templates
├── ui.content/     ← Page content, templates, policies (JCR content)
├── ui.config/      ← OSGi configurations (author/publish/runmode)
├── all/            ← Aggregator package (embeds all sub-packages)
├── it.tests/       ← Java integration tests
├── ui.tests/       ← Cypress UI tests
└── dispatcher/     ← Apache/Dispatcher config
```

---

## 2. Local Development Setup

### Prerequisites

| Tool    | Version            |
| ------- | ------------------ |
| Java    | 11 or 17           |
| Maven   | 3.8+               |
| Node.js | 20.x LTS           |
| AEM SDK | 6.5 or AEMaaCS SDK |

### First-time setup

```bash
# 1. Install frontend dependencies
cd ui.frontend
npm install

# 2. Full Maven build + deploy to local AEM (localhost:4502)
cd ..
mvn clean install -PautoInstallSinglePackage
```

### Frontend DevServer (HMR)

```bash
cd ui.frontend
npm run start      # Vite DevServer on http://localhost:3000
                   # Open AEM page normally — JS/CSS served via Vite with Hot Reload
```

### Build-only deploy (no DevServer)

```bash
# Unminified, for AEM debugging
cd ui.frontend && npm run dev

# Production minified
cd ui.frontend && npm run prod

# Then redeploy ui.apps to AEM
cd .. && mvn clean install -PautoInstallSinglePackage -pl ui.apps
```

---

## 3. Backend — `core/`

All Java source lives in `core/src/main/java/com/adkstvite/core/`.

```
core/src/main/java/com/adkstvite/core/
├── models/       ← Sling Models
├── servlets/     ← Sling Servlets
├── services/     ← OSGi Services (interfaces + implementations)
├── filters/      ← Sling Filters
├── schedulers/   ← OSGi Schedulers
└── listeners/    ← JCR / Sling Event Listeners
```

---

### 3.1 Sling Models

**Location:** `core/src/main/java/com/adkstvite/core/models/`

**Naming convention:** `<ComponentName>Model.java` — e.g. `HeroModel.java`

**Minimal example:**

```java
package com.adkstvite.core.models;

import com.adobe.cq.export.json.ComponentExporter;
import com.adobe.cq.export.json.ExporterConstants;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(
    adaptables = SlingHttpServletRequest.class,
    adapters = { HeroModel.class, ComponentExporter.class },
    resourceType = "adkstvite/components/hero",
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
@Exporter(name = ExporterConstants.SLING_MODEL_EXPORTER_NAME,
          extensions = ExporterConstants.SLING_MODEL_EXTENSION)
public class HeroModel implements ComponentExporter {

    @ValueMapValue
    private String title;

    @ValueMapValue
    private String description;

    public String getTitle() { return title; }
    public String getDescription() { return description; }

    @Override
    public String getExportedType() {
        return "adkstvite/components/hero";
    }
}
```

**Key annotations:**

| Annotation                                           | Purpose                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `@Model(adaptables = SlingHttpServletRequest.class)` | Makes the model usable from HTL via `data-sly-use`                      |
| `@Model(adaptables = Resource.class)`                | Makes the model usable when adapting a Resource directly                |
| `@ValueMapValue`                                     | Injects a JCR property from the component's resource                    |
| `@ChildResource`                                     | Injects a child node as a Resource or another Model                     |
| `@OSGiService`                                       | Injects an OSGi service                                                 |
| `@SlingObject`                                       | Injects Sling objects (ResourceResolver, SlingHttpServletRequest, etc.) |
| `@ScriptVariable`                                    | Injects HTL script variables (currentPage, pageProperties, etc.)        |
| `DefaultInjectionStrategy.OPTIONAL`                  | Prevents NPE when a JCR property is absent                              |

**Use in HTL:**

```html
<sly data-sly-use.model="com.adkstvite.core.models.HeroModel">
  <h1>${model.title}</h1>
  <p>${model.description}</p>
</sly>
```

---

### 3.2 OSGi Services

**Location:** `core/src/main/java/com/adkstvite/core/services/`

**Convention:** Define an interface + `impl/` subfolder for the implementation.

```
services/
├── MyService.java          ← interface
└── impl/
    └── MyServiceImpl.java  ← @Component implementation
```

**Example interface:**

```java
package com.adkstvite.core.services;

public interface ContentService {
    String getContent(String path);
}
```

**Example implementation:**

```java
package com.adkstvite.core.services.impl;

import com.adkstvite.core.services.ContentService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.Designate;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@Component(service = ContentService.class, immediate = true)
@Designate(ocd = ContentServiceImpl.Config.class)
public class ContentServiceImpl implements ContentService {

    @ObjectClassDefinition(name = "Content Service Configuration")
    public @interface Config {
        @AttributeDefinition(name = "Base Path", description = "JCR root path")
        String basePath() default "/content/adkstvite";
    }

    private String basePath;

    @Activate
    @Modified
    protected void activate(Config config) {
        this.basePath = config.basePath();
    }

    @Override
    public String getContent(String path) {
        return basePath + path;
    }
}
```

**Inject the service into a Sling Model:**

```java
@OSGiService
private ContentService contentService;
```

**OSGi config files** go in `ui.config/` — see [section 7](#7-osgi-config--uiconfig).

---

### 3.3 Servlets

**Location:** `core/src/main/java/com/adkstvite/core/servlets/`

**Two types:**

#### Resource-type bound servlet (preferred)

Responds to GET/POST on a specific component resource type.

```java
package com.adkstvite.core.servlets;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.apache.sling.servlets.annotations.SlingServletResourceTypes;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;

@Component(service = Servlet.class)
@SlingServletResourceTypes(
    resourceTypes = "adkstvite/components/hero",
    methods = HttpConstants.METHOD_GET,
    extensions = "json"
)
public class HeroServlet extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request,
                         SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.getWriter().write("{\"status\":\"ok\"}");
    }
}
```

URL: `/content/adkstvite/page/jcr:content/root/hero.json`

#### Path-bound servlet

Responds to a fixed path (use sparingly—prefer resource-type binding).

```java
@SlingServletPaths("/bin/adkstvite/myapi")
```

URL: `/bin/adkstvite/myapi`

> **Security note:** Path-bound servlets bypass Sling's resource resolution and are reachable without authentication by default. Always check `request.getResourceResolver().getUserID()` or use a Sling authentication requirement.

---

### 3.4 Filters

**Location:** `core/src/main/java/com/adkstvite/core/filters/`

Sling Filters intercept every request in the Sling processing chain.

```java
@Component(service = Filter.class)
@SlingServletFilter(
    scope = SlingServletFilterScope.REQUEST,
    pattern = "/content/adkstvite/.*",
    methods = "GET"
)
public class MyRequestFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) throws IOException, ServletException {
        // pre-process
        chain.doFilter(request, response);
        // post-process
    }

    @Override public void init(FilterConfig filterConfig) {}
    @Override public void destroy() {}
}
```

---

### 3.5 Schedulers

**Location:** `core/src/main/java/com/adkstvite/core/schedulers/`

```java
@Component(service = Runnable.class)
@Designate(ocd = SimpleScheduledTask.Config.class)
public class SimpleScheduledTask implements Runnable {

    @ObjectClassDefinition(name = "Simple Scheduler Config")
    public @interface Config {
        @AttributeDefinition(name = "Cron expression")
        String scheduler_expression() default "0 * * * * ?";   // every minute

        @AttributeDefinition(name = "Enabled")
        boolean scheduler_concurrent() default false;
    }

    @Override
    public void run() {
        // task logic
    }
}
```

Configure the cron expression via OSGi config in `ui.config/` (see section 7).

---

### 3.6 Event Listeners

**Location:** `core/src/main/java/com/adkstvite/core/listeners/`

```java
@Component(service = EventHandler.class,
           property = {
               EventConstants.EVENT_TOPIC + "=" + SlingConstants.TOPIC_RESOURCE_CHANGED,
               EventConstants.EVENT_FILTER + "=(path=/content/adkstvite/*)"
           })
public class ContentChangeListener implements EventHandler {

    @Override
    public void handleEvent(Event event) {
        String path = (String) event.getProperty(SlingConstants.PROPERTY_PATH);
        // react to change
    }
}
```

---

### 3.7 OSGi Configurations

Runtime configuration values for services/schedulers are stored as `.cfg.json` files in `ui.config/`. See [section 7](#7-osgi-config--uiconfig).

---

## 4. Frontend — `ui.frontend/`

```
ui.frontend/
├── vite.config.ts                    ← Vite build config (replaces webpack)
├── clientlib.config.js               ← aem-clientlib-generator config
├── tsconfig.json
├── package.json
└── src/main/webpack/
    ├── site/
    │   ├── main.ts                   ← JS entry point
    │   ├── main.scss                 ← CSS entry point
    │   ├── _variables.scss           ← SCSS variables
    │   ├── _base.scss                ← Base/reset styles
    │   └── styles/                   ← Page-level styles
    │       ├── container_main.scss
    │       ├── experiencefragment_footer.scss
    │       └── experiencefragment_header.scss
    └── components/                   ← Component-level SCSS files
        ├── _accordion.scss
        ├── _button.scss
        └── ...
```

> The `src/main/webpack/` folder name is a legacy artifact from the archetype. It now contains Vite-compiled source, not webpack.

---

### 4.1 SCSS / Global Styles

**Where to add:**

| What                                | Where                              |
| ----------------------------------- | ---------------------------------- |
| CSS variables, breakpoints, colours | `site/_variables.scss`             |
| Base/reset/typography               | `site/_base.scss`                  |
| Page-level layout styles            | `site/styles/<pagestyle>.scss`     |
| Component styles                    | `components/_<componentname>.scss` |

**After adding a new SCSS file**, register it in `site/main.scss`:

```scss
// Add to the corresponding section in main.scss
@import "../components/mycomponent";
```

---

### 4.2 TypeScript / JavaScript

**Entry point:** `site/main.ts`

Add module-level code here or import from other files:

```ts
// site/main.ts
import { initNavigation } from "./navigation";
initNavigation();
```

Use `import.meta.glob` for auto-scanning directories:

```ts
// Eagerly import all TS files under a folder
const modules = import.meta.glob("./widgets/**/*.ts", { eager: true });
```

---

### 4.3 React Components

**Where to add:** `src/main/webpack/site/components/` (create if needed) or any subfolder — Vite resolves them via `tsconfig` path aliases.

```
src/main/webpack/site/
└── components/
    └── HeroBanner/
        ├── HeroBanner.tsx
        └── HeroBanner.module.scss   ← CSS Modules (optional)
```

**Mount a React component on an AEM DOM element:**

```tsx
// site/main.ts
import React from "react";
import { createRoot } from "react-dom/client";
import HeroBanner from "./components/HeroBanner/HeroBanner";

document
  .querySelectorAll<HTMLElement>('[data-component="hero-banner"]')
  .forEach((el) => {
    const props = JSON.parse(el.dataset.props ?? "{}");
    createRoot(el).render(<HeroBanner {...props} />);
  });
```

**In the HTL template** (`helloworld.html` pattern):

```html
<div
  data-component="hero-banner"
  data-props="${{'title': model.title, 'text': model.text} @ json}"
></div>
```

---

### 4.4 Static Assets

**Where to add:** `src/main/webpack/static/`

Files in `static/` are served as-is by Vite's DevServer. After build they go through the clientlib as `resources/static/`.

Import assets in JS/TS so Vite tracks them:

```ts
import logoUrl from "../static/images/logo.svg";
// logoUrl = '/etc.clientlibs/adkstvite/clientlibs/clientlib-site/resources/static/logo.<hash>.svg'
```

---

## 5. AEM Components — `ui.apps/`

```
ui.apps/src/main/content/jcr_root/apps/adkstvite/
├── components/          ← AEM component definitions
│   ├── helloworld/      ← Example custom component
│   ├── page/            ← Page component (header/footer libs)
│   └── <name>/          ← Your custom components go here
├── clientlibs/          ← ClientLibrary folders
└── i18n/                ← Translation files
```

---

### 5.1 Custom Components

**To create a new component**, add a folder under `components/`:

```
components/hero/
├── .content.xml          ← Component definition (jcr:primaryType, sling:resourceSuperType)
├── hero.html             ← HTL template
├── _cq_dialog/
│   └── .content.xml      ← Author dialog (Granite UI fields)
└── _cq_editConfig.xml    ← Edit bar actions (optional)
```

**`.content.xml` (component definition):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:Component"
          jcr:title="Hero Banner"
          jcr:description="Full-width hero with title and CTA"
          sling:resourceSuperType="core/wcm/components/title/v3/title"
          componentGroup="adkstvite - Content"/>
```

Set `componentGroup` to control where the component appears in the Sites editor sidebar.

---

### 5.2 Sightly / HTL Templates

**File:** `components/<name>/<name>.html`

```html
<!--/* hero.html */-->
<sly data-sly-use.model="com.adkstvite.core.models.HeroModel" />
<sly data-sly-use.templates="core/wcm/components/commons/v1/templates.html" />

<section class="hero ${model.cssClass @ context='attribute'}">
  <h1>${model.title}</h1>
  <p>${model.description}</p>
  <sly data-sly-call="${templates.placeholder @ isEmpty=!model.title}" />
</section>
```

**HTL context values:**

| Context          | Use for                                             |
| ---------------- | --------------------------------------------------- |
| `text` (default) | Safe text content — escapes HTML entities           |
| `html`           | Rich text from RTE — allows limited safe HTML       |
| `attribute`      | Attribute values — escapes `"` characters           |
| `uri`            | URL values — validates and encodes URLs             |
| `unsafe`         | No escaping — use only with trusted internal values |

---

### 5.3 Component Dialogs

**Location:** `components/<name>/_cq_dialog/.content.xml`

Granite UI fields inside the dialog:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:granite="http://www.adobe.com/jcr/granite/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          jcr:primaryType="nt:unstructured"
          jcr:title="Hero Banner"
          sling:resourceType="cq/gui/components/authoring/dialog">
    <content jcr:primaryType="nt:unstructured"
             sling:resourceType="granite/ui/components/coral/foundation/container">
        <items jcr:primaryType="nt:unstructured">
            <tabs jcr:primaryType="nt:unstructured"
                  sling:resourceType="granite/ui/components/coral/foundation/tabs">
                <items jcr:primaryType="nt:unstructured">
                    <properties jcr:primaryType="nt:unstructured"
                                jcr:title="Properties"
                                sling:resourceType="granite/ui/components/coral/foundation/container">
                        <items jcr:primaryType="nt:unstructured">
                            <title jcr:primaryType="nt:unstructured"
                                   sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
                                   fieldLabel="Title"
                                   name="./title"/>
                            <description jcr:primaryType="nt:unstructured"
                                         sling:resourceType="granite/ui/components/coral/foundation/form/textarea"
                                         fieldLabel="Description"
                                         name="./description"/>
                        </items>
                    </properties>
                </items>
            </tabs>
        </items>
    </content>
</jcr:root>
```

**Common Granite UI field resource types:**

| Field type       | `sling:resourceType`                                      |
| ---------------- | --------------------------------------------------------- |
| Text field       | `granite/ui/components/coral/foundation/form/textfield`   |
| Textarea         | `granite/ui/components/coral/foundation/form/textarea`    |
| Checkbox         | `granite/ui/components/coral/foundation/form/checkbox`    |
| Select/dropdown  | `granite/ui/components/coral/foundation/form/select`      |
| Path picker      | `granite/ui/components/coral/foundation/form/pathbrowser` |
| Rich text editor | `cq/gui/components/authoring/dialog/richtext`             |
| Image upload     | `cq/gui/components/authoring/dialog/fileupload`           |
| Number field     | `granite/ui/components/coral/foundation/form/numberfield` |

---

### 5.4 ClientLibs

**Location:** `ui.apps/src/main/content/jcr_root/apps/adkstvite/clientlibs/`

Existing clientlibs:

| Folder                   | Category                 | Purpose                                                                  |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| `clientlib-base`         | `adkstvite.base`         | Shared base styles/scripts (Core Components dependencies)                |
| `clientlib-site`         | `adkstvite.site`         | Vite-built JS + CSS (auto-generated by `aem-clientlib-generator`)        |
| `clientlib-dependencies` | `adkstvite.dependencies` | Third-party vendor scripts (legacy — can be used for non-ES-module libs) |
| `clientlib-grid`         | `adkstvite.grid`         | AEM responsive grid CSS                                                  |

**Do not edit `clientlib-site/` manually** — it is overwritten every time `npm run dev` or `npm run prod` runs.

To add a new global library (e.g. a CDN script that cannot be bundled by Vite):

1. Add the file to `clientlib-base/` or create a new clientlib folder
2. Reference it in the `js.txt` or `css.txt` file in that clientlib
3. Load it in `customheaderlibs.html` or `customfooterlibs.html`

---

### 5.5 i18n Translations

**Location:** `ui.apps/src/main/content/jcr_root/apps/adkstvite/i18n/`

Add a JSON file per language (`en.json`, `fr.json`, etc.):

```json
{
  "Read More": "En savoir plus",
  "Contact Us": "Contactez-nous"
}
```

Each file needs a matching `.dir/.content.xml` to declare the JCR node type and language:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:mix="http://www.jcp.org/jcr/mix/1.0"
          jcr:language="fr"
          jcr:mixinTypes="[mix:language]"
          jcr:primaryType="nt:folder"/>
```

Use in HTL:

```html
<sly data-sly-use.i18n="com.day.cq.i18n.I18n" />
<a href="#">${i18n.get('Read More')}</a>
```

---

## 6. Content — `ui.content/`

```
ui.content/src/main/content/jcr_root/content/adkstvite/
├── language-masters/
│   └── en/          ← Master language content pages
└── ...
```

**Use for:**

- Editable templates structure (`/conf/adkstvite/settings/wcm/templates/`)
- Content policies (`/conf/adkstvite/settings/wcm/policies/`)
- Initial page content used as sample / seed data
- DAM assets that are part of the project setup

**Do not store** production content here — this is deployed on every build and will overwrite author-created content if the filter uses `mode="replace"`.

Check `ui.content/src/main/content/META-INF/vault/filter.xml` and use `mode="merge"` for any paths where authors create content.

---

## 7. OSGi Config — `ui.config/`

```
ui.config/src/main/content/jcr_root/apps/adkstvite/osgiconfig/
├── config/           ← All runmodes (author + publish)
├── config.author/    ← Author-only config
└── config.publish/   ← Publish-only config
```

**File naming:** `<fully.qualified.ClassName>.cfg.json`

**Example** — configure the scheduler from section 3.5:

`config/com.adkstvite.core.schedulers.SimpleScheduledTask.cfg.json`

```json
{
  "scheduler.expression": "0 0 2 * * ?",
  "scheduler.concurrent": false
}
```

**Example** — configure an OSGi service:

`config/com.adkstvite.core.services.impl.ContentServiceImpl.cfg.json`

```json
{
  "basePath": "/content/adkstvite"
}
```

**Runmode configs** (author-only, publish-only):

```
config.author/com.day.cq.replication.Agent.publish.cfg.json
config.publish/com.adkstvite.core.services.impl.ContentServiceImpl.cfg.json
```

> Use `config.author` for anything that should only run on author (replication agents, workflow launchers). Use `config.publish` for caching, CDN, or performance-sensitive services.

---

## 8. All Package — `all/`

The `all` module embeds all sub-packages into a single deployable zip.

**`all/pom.xml`** controls what gets embedded. When you add a new sub-module to the project, add both a `<dependency>` and an `<embedded>` entry here.

```xml
<!-- Dependency declaration -->
<dependency>
    <groupId>com.adkstvite</groupId>
    <artifactId>adkstvite.mynewmodule</artifactId>
    <type>zip</type>
</dependency>

<!-- Embedded entry -->
<embedded>
    <groupId>com.adkstvite</groupId>
    <artifactId>adkstvite.mynewmodule</artifactId>
    <type>zip</type>
    <target>/apps/adkstvite-packages/application/install</target>
</embedded>
```

**`all/src/main/content/META-INF/vault/filter.xml`** must declare a filter root for every new path you add to the project.

---

## 9. Build & Deploy

### Full build

```bash
# Build and deploy everything to localhost:4502
mvn clean install -PautoInstallSinglePackage

# Deploy to a specific host
mvn clean install -PautoInstallSinglePackage -Daem.host=myaem.example.com -Daem.port=4502
```

### Deploy a single module (faster iteration)

```bash
# Backend only (core OSGi bundle)
mvn clean install -pl core -PautoInstallBundle

# Apps package only (components, clientlibs)
mvn clean install -pl ui.apps -PautoInstallPackage

# Content package only
mvn clean install -pl ui.content -PautoInstallPackage

# Config package only
mvn clean install -pl ui.config -PautoInstallPackage

# Resume from a failed module
mvn clean install -PautoInstallSinglePackage -rf :adkstvite.ui.apps
```

### Frontend only (no Maven)

```bash
cd ui.frontend

npm run start    # DevServer with HMR
npm run dev      # Build unminified → ui.apps (still requires mvn deploy after)
npm run prod     # Build production → ui.apps
```

---

## 10. Testing

### Unit tests (Java)

**Location:** `core/src/test/java/com/adkstvite/core/`

Uses **AEM Mocks** (`io.wcm.testing.aem-mock`). Each class in `core/src/main/java/` should have a corresponding test class.

```bash
mvn test -pl core
```

**Structure mirrors main:**

```
core/src/test/java/com/adkstvite/core/
├── models/       ← HelloWorldModelTest.java
├── servlets/     ← SimpleServletTest.java
├── filters/      ← LoggingFilterTest.java
├── schedulers/   ← SimpleScheduledTaskTest.java
├── listeners/    ← SimpleResourceListenerTest.java
└── testcontext/  ← AppAemContext.java (shared AemContext setup)
```

**AppAemContext** provides a pre-configured `AemContext` with Core Components registered:

```java
import com.adkstvite.core.testcontext.AppAemContext;
import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(AemContextExtension.class)
class HeroModelTest {

    private final AemContext ctx = AppAemContext.newAemContext();

    @Test
    void testGetTitle() {
        ctx.currentResource(ctx.create().resource("/content/hero",
            "jcr:primaryType", "nt:unstructured",
            "title", "Hello World"));

        HeroModel model = ctx.request().adaptTo(HeroModel.class);
        assertEquals("Hello World", model.getTitle());
    }
}
```

### Integration tests

**Location:** `it.tests/src/main/java/com/adkstvite/it/tests/`

Run against a live AEM instance:

```bash
mvn clean verify -Pintegration-tests \
  -Daem.author.url=http://localhost:4502 \
  -Daem.author.user=admin \
  -Daem.author.password=admin
```

### Cypress UI tests

**Location:** `ui.tests/test-module/`

```bash
cd ui.tests/test-module
npx cypress open    # Interactive mode
npx cypress run     # Headless CI mode
```

---

## 11. Multi-Site Manager (MSM)

MSM lets you maintain a single master site (Blueprint) and roll content/structure changes out to one or more Live Copies (language variations, region sites, brand variants).

### 11.1 Live Copies

**Blueprint** — The master source site, e.g. `/content/adkstvite/language-masters/en`.

**Live Copy** — A copy that inherits from the Blueprint, e.g. `/content/adkstvite/us/en`.

Create via the Sites console: _Create → Live Copy_. The relationship is stored as `cq:LiveRelationship` mixin nodes in the JCR.

**Key JCR properties on a live copy page:**

| Property                          | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `cq:isLiveCopy`                   | `true` — marks this node as part of a live copy   |
| `cq:liveSyncConfig` → `cq:master` | Path to the Blueprint source                      |
| `cq:propertyInheritanceCancelled` | Array of property names excluded from inheritance |

**Suspending / Cancelling inheritance** on a component:

- _Suspend_: temporarily stops inheritance; can be resumed later.
- _Cancel_: permanently detaches the component from the Blueprint.

Both actions add the component path to `cq:childrenOrder` with an `cq:isLiveCopy=false` marker.

---

### 11.2 Rollout Configs

Rollout Configs define _what_ gets rolled out from Blueprint → Live Copy and _when_.

**Built-in configs** (available in OSGi at `/libs/msm/wcm/rolloutconfigs/`):

| Config name             | Trigger                      | What it does                         |
| ----------------------- | ---------------------------- | ------------------------------------ |
| `default`               | Manual rollout               | Copies page structure and properties |
| `standardRolloutConfig` | Manual + activation          | Most commonly used                   |
| `activate`              | Author activates Blueprint   | Auto-rolls on activation             |
| `deactivate`            | Author deactivates Blueprint | Auto-rolls deactivation              |
| `targetUpdate`          | Blueprint modified           | Used with AEM Target integration     |

**Custom rollout config** — stored in `ui.content` or `ui.config`:

```
ui.content/src/main/content/jcr_root/
└── etc/
    └── msm/
        └── rolloutconfigs/
            └── adkstviteCustomRollout/
                └── .content.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          jcr:primaryType="cq:RolloutConfig"
          jcr:title="adkstvite Custom Rollout"
          cq:trigger="rollout">
    <cq:LiveSyncAction
        jcr:primaryType="nt:unstructured"
        cq:exclusive="false"
        jcr:title="Content Update Action"
        sling:resourceType="wcm/msm/content/components/rolloutaction"
        className="com.day.cq.wcm.msm.impl.actions.ContentUpdateActionFactory"/>
</jcr:root>
```

Assign a rollout config to a Blueprint page via its _Properties → Blueprint_ tab.

---

### 11.3 MSM-aware Components

If a component stores data that **should not be rolled out** (e.g. region-specific prices), exclude those JCR properties:

**In `_cq_dialog/.content.xml`** — add `cq:overwrite="false"` or `cq:ignoreRollout="true"` on the dialog item:

```xml
<price jcr:primaryType="nt:unstructured"
       sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
       fieldLabel="Price"
       name="./price"
       cq:ignoreRollout="true"/>
```

**Programmatically** in a Sling Model — detect Live Copy context:

```java
@OSGiService
private LiveRelationshipManager relationshipManager;

public boolean isLiveCopy(Resource resource) {
    try {
        return relationshipManager.getLiveRelationship(resource, false) != null;
    } catch (WCMException e) {
        return false;
    }
}
```

---

## 12. DAM / Assets

All assets live under `/content/dam/`. The DAM is accessed programmatically via the `Asset` API or via AEM's AssetManager.

### 12.1 Asset Metadata Schemas

**Location (content):** `/conf/adkstvite/settings/dam/adminui-extension/metadataschema/`

Store the schema node structure in `ui.content`:

```
ui.content/src/main/content/jcr_root/conf/adkstvite/settings/dam/
└── adminui-extension/
    └── metadataschema/
        └── adkstvite-schema/
            └── .content.xml   ← Schema definition with Granite UI fields
```

Metadata schema fields use the same Granite UI resource types as component dialogs. The `name` attribute maps to a JCR property on the asset's `jcr:content/metadata` node:

```xml
<rightsOwner jcr:primaryType="nt:unstructured"
             sling:resourceType="granite/ui/components/coral/foundation/form/textfield"
             fieldLabel="Rights Owner"
             name="./jcr:content/metadata/xmpRights:Owner"/>
```

---

### 12.2 Custom Asset Workflows

Asset processing (thumbnail generation, metadata extraction, etc.) is done via Workflows triggered on asset upload. See [section 13](#13-workflows) for the Java workflow step API.

Common built-in DAM workflows:

| Workflow                   | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `DAM Update Asset`         | Default — runs on every upload: extracts metadata, creates renditions |
| `DAM Metadata Writeback`   | Writes XMP metadata back to binary                                    |
| `DAM Parse Word Documents` | Extracts content from .docx                                           |
| `Request for Activation`   | Initiates a review before publication                                 |

Custom DAM workflow steps follow the same pattern as regular workflow steps (section 13.2). Register them under a `dam/` sub-package in your service.

---

### 12.3 Renditions & Processing Profiles

Renditions are alternate versions of an asset (e.g. thumbnails, web-optimised crops). They are stored at `/content/dam/<path>/jcr:content/renditions/`.

**Image Profile** — defines crop/resize presets, stored in `ui.content`:

```
ui.content/src/main/content/jcr_root/conf/adkstvite/settings/dam/
└── processing/
    └── adkstvite-profile/
        └── .content.xml
```

**Reading a specific rendition in Java:**

```java
import com.day.cq.dam.api.Asset;
import com.day.cq.dam.api.Rendition;

Resource assetResource = resourceResolver.getResource("/content/dam/adkstvite/images/hero.jpg");
Asset asset = assetResource.adaptTo(Asset.class);

// Original binary
Rendition original = asset.getOriginal();

// Named rendition (created by image profile or workflow)
Rendition thumb = asset.getRendition("cq5dam.thumbnail.319.319.png");
```

**Reading asset metadata:**

```java
ValueMap metadata = asset.getMetadata();
String title      = metadata.get("dc:title", String.class);
String copyright  = metadata.get("xmpRights:Owner", String.class);
```

---

### 12.4 Referencing Assets in Components

**In a component dialog** — use a path browser filtered to DAM:

```xml
<image jcr:primaryType="nt:unstructured"
       sling:resourceType="granite/ui/components/coral/foundation/form/pathbrowser"
       fieldLabel="Image"
       name="./fileReference"
       rootPath="/content/dam/adkstvite"
       filter="hierarchyNotFile"/>
```

**In a Sling Model** — resolve the asset from a `fileReference` property:

```java
@ValueMapValue
private String fileReference;      // e.g. "/content/dam/adkstvite/hero.jpg"

public String getImagePath() {
    // Return directly — Sling/AEM resolves it to the published URL
    return fileReference;
}

// Or resolve to full Asset object:
public Asset getAsset() {
    Resource r = resourceResolver.getResource(fileReference);
    return r != null ? r.adaptTo(Asset.class) : null;
}
```

**In HTL:**

```html
<img src="${model.imagePath}" alt="${model.imageAlt}" />
```

For advanced responsive image rendering, delegate to the Core Components `image` component via `sling:include` or extend `com.adobe.cq.wcm.core.components.models.Image`.

---

## 13. Workflows

AEM Workflows automate multi-step processes: content review, asset processing, page activation, etc.

### 13.1 Where Workflow Artifacts Live

| Artifact                        | Location                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Workflow model (definition)     | `/var/workflow/models/<name>` (runtime) or `/conf/global/settings/workflow/models/` (editable) |
| Workflow launcher               | `/conf/global/settings/workflow/launcher/config/<name>`                                        |
| Custom process step (Java)      | `core/src/main/java/com/adkstvite/core/workflow/`                                              |
| Workflow model XML (deployable) | `ui.content/src/main/content/jcr_root/conf/global/settings/workflow/models/<name>/`            |

Create a `workflow/` package inside `core`:

```
core/src/main/java/com/adkstvite/core/
└── workflow/
    ├── steps/         ← WorkflowProcess implementations
    └── participants/  ← WorkflowParticipantStepChooser implementations
```

---

### 13.2 Custom Workflow Process Step

A process step runs Java code automatically (no human interaction).

```java
package com.adkstvite.core.workflow.steps;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.exec.WorkflowProcess;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(
    service = WorkflowProcess.class,
    property = { "process.label=adkstvite - My Custom Step" }
)
public class MyCustomStep implements WorkflowProcess {

    private static final Logger log = LoggerFactory.getLogger(MyCustomStep.class);

    @Override
    public void execute(WorkItem workItem,
                        WorkflowSession workflowSession,
                        MetaDataMap metaDataMap) throws WorkflowException {

        // The path of the payload (page or asset)
        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        log.info("Processing payload: {}", payloadPath);

        // Read step arguments defined in the workflow model editor
        String myArg = metaDataMap.get("PROCESS_ARGS", "default-value");

        // Do work here. Use workflowSession.adaptTo(ResourceResolver.class)
        // for JCR access.
    }
}
```

Register it in a workflow model via Tools → Workflow → Models → Edit, drag _Process Step_, set _Process_ to `adkstvite - My Custom Step`.

---

### 13.3 Custom Workflow Participant Step

A participant step pauses the workflow and assigns a task to a user/group inbox.

**Dynamic participant step** — choose the assignee at runtime:

```java
package com.adkstvite.core.workflow.participants;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.ParticipantStepChooser;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import org.osgi.service.component.annotations.Component;

@Component(
    service = ParticipantStepChooser.class,
    property = { "chooser.label=adkstvite - Content Reviewer" }
)
public class ContentReviewerChooser implements ParticipantStepChooser {

    @Override
    public String getParticipant(WorkItem workItem,
                                 WorkflowSession workflowSession,
                                 MetaDataMap metaDataMap) throws WorkflowException {
        // Return a user ID or group ID
        // e.g. derive the reviewer from the payload path
        String path = workItem.getWorkflowData().getPayload().toString();
        if (path.startsWith("/content/adkstvite/us")) {
            return "us-content-reviewers";  // group ID
        }
        return "content-authors";           // fallback group
    }
}
```

In the workflow model editor, use _Dynamic Participant Step_ and set _Participant Chooser_ to `adkstvite - Content Reviewer`.

---

### 13.4 Launching a Workflow Programmatically

```java
import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.model.WorkflowModel;
import org.apache.sling.api.resource.ResourceResolver;

// Inside a Sling Model or OSGi Service:

private void startWorkflow(ResourceResolver resolver, String payloadPath)
        throws WorkflowException {

    WorkflowSession wfSession = resolver.adaptTo(WorkflowSession.class);
    WorkflowModel   model     = wfSession.getModel(
            "/var/workflow/models/adkstvite/my-review-workflow");

    com.adobe.granite.workflow.exec.WorkflowData data =
            wfSession.newWorkflowData("JCR_PATH", payloadPath);

    wfSession.startWorkflow(model, data);
}
```

---

### 13.5 Workflow Launcher Config

Launchers auto-start a workflow when a JCR event matches a condition (e.g. asset uploaded, page modified).

Store launcher configs in `ui.content`:

```
ui.content/src/main/content/jcr_root/conf/global/settings/workflow/launcher/config/
└── adkstvite-asset-upload/
    └── .content.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          jcr:primaryType="sling:OsgiConfig"
          enabled="true"
          eventType="NODE_CREATED"
          glob="/content/dam/adkstvite(/.*)?"
          nodetype="dam:Asset"
          workflow="/var/workflow/models/adkstvite/my-asset-workflow"
          excludeList=""
          runModes="author"/>
```

**Key launcher properties:**

| Property    | Values                                          | Description                              |
| ----------- | ----------------------------------------------- | ---------------------------------------- |
| `eventType` | `NODE_CREATED`, `NODE_MODIFIED`, `NODE_REMOVED` | JCR event that fires the launcher        |
| `glob`      | JCR path glob                                   | Scope of paths that trigger the launcher |
| `nodetype`  | e.g. `dam:Asset`, `cq:Page`                     | Restrict to specific node types          |
| `runModes`  | `author`, `publish`                             | Which AEM instance type launches this    |
| `enabled`   | `true` / `false`                                | Toggle without removing the config       |

> **Tip:** Use `enabled="false"` in `config.publish/` to prevent workflows firing on publish where they are not needed.
