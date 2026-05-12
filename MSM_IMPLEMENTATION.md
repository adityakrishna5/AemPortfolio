# MSM Implementation

## What is AEM MSM?

AEM Multi-Site Manager (MSM) lets you create **Live Copies** of a source content tree. A Live Copy is a real JCR page tree linked to a master (called the **Blueprint**). When the master changes, you can **roll out** those changes to all Live Copies in one operation. Individual properties on Live Copy pages can have their inheritance **cancelled** so that locale-specific content (translated text, local links) survives rollouts without being overwritten.

---

## Architecture in this project

```
BLUEPRINT (source of truth)
  /content/adkstvite/us/en/
    ├── home
    ├── about-us
    ├── sign-in
    └── register
          │
          │  cq:LiveRelationship / cq:LiveSync
          │  rolloutConfig = adkstvite-standard
          ▼
LIVE COPIES
  /content/adkstvite/fr/fr/   (jcr:language = fr)
  /content/adkstvite/es/es/   (jcr:language = es)
          │
          │  template structure includes XF refs pointing at us/en
          │  Core XF v2 auto-swaps path to matching locale at render time
          ▼
LOCALIZED EXPERIENCE FRAGMENTS
  /content/experience-fragments/adkstvite/us/en/site/{header,footer}/master
  /content/experience-fragments/adkstvite/fr/fr/site/{header,footer}/master
  /content/experience-fragments/adkstvite/es/es/site/{header,footer}/master
```

One blueprint, two Live Copies. Each Live Copy shares page structure with the US-English master but carries translated property values.

---

## Rollout config — `adkstvite-standard`

File: `ui.content/src/main/content/jcr_root/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard/.content.xml`

```xml
<jcr:content jcr:primaryType="cq:RolloutConfig"
    jcr:title="AdventureTrails Standard Rollout"
    cq:trigger="rollout">
  <contentUpdate  sling:resourceType="wcm/msm/components/actions/contentUpdate"/>
  <contentCopy    sling:resourceType="wcm/msm/components/actions/contentCopy"/>
  <contentDelete  sling:resourceType="wcm/msm/components/actions/contentDelete"/>
  <referencesUpdate sling:resourceType="wcm/msm/components/actions/referencesUpdate"/>
</jcr:content>
```

### Rollout actions

| Action             | What it does                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `contentUpdate`    | Copies modified properties from master → live copy (unless inheritance is cancelled on that property)  |
| `contentCopy`      | Copies new nodes added to master to all live copies                                                    |
| `contentDelete`    | Removes nodes from live copies that were deleted from master                                           |
| `referencesUpdate` | Rewrites internal paths (e.g. `/content/adkstvite/us/en/…`) to the live copy locale path after rollout |

`cq:trigger=rollout` means changes propagate **manually** (author initiates rollout from Sites console or via API). There is no automatic rollout on save — this avoids accidentally pushing draft master edits to live copy pages.

---

## How Live Copies are created

Live Copies are created at runtime, **not** in source XML, using the AEM WCM command API:

```
POST /bin/wcmcommand
  cmd=createLiveCopy
  srcPath=/content/adkstvite/us/en
  destPath=/content/adkstvite/fr
  label=fr
  title=French
  excludeSubPages=false
  rolloutConfigs=/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard
```

`excludeSubPages=false` copies the entire `us/en` subtree (home, about-us, sign-in, register) and establishes `cq:LiveRelationship` + `cq:LiveSync` mixins on every copied node. After creation, `jcr:language=fr` is set on `/content/adkstvite/fr/fr/jcr:content`.

Why not source-control the fr/es trees? Because those pages are owned by MSM at runtime. Committing them to source and deploying them with `replace` mode would strip MSM relationship mixins.

---

## Content filter strategy (`filter.xml`)

```xml
<!-- English master: source-controlled, wiped and recreated on deploy -->
<filter root="/content/adkstvite" mode="replace">
    <exclude pattern="/content/adkstvite/fr(/.*)?"/>
    <exclude pattern="/content/adkstvite/es(/.*)?"/>
</filter>

<!-- Live copy roots: merge so MSM-created children survive deploy -->
<filter root="/content/adkstvite/fr/fr/destinations" mode="merge"/>
<filter root="/content/adkstvite/es/es/destinations" mode="merge"/>

<!-- XFs: replace to purge stale archetype content on deploy -->
<filter root="/content/experience-fragments/adkstvite"/>
```

The `replace` + `exclude` combination on `/content/adkstvite` means:

- Every `mvn install` rebuilds the `us/en` tree from source (clean, authoritative)
- The `fr/` and `es/` subtrees are untouched by the deployment (MSM owns them)
- Only the narrow `destinations` subtree within each locale is source-controlled (these are source-managed destination listing pages, not runtime-only MSM copies)

---

## JCR mixins on a Live Copy page

When `createLiveCopy` runs, every page node in the live copy gets two mixins:

```
jcr:mixinTypes = [cq:LiveRelationship]
```

And a child node `cq:LiveSyncConfig` of type `cq:LiveSync` is added to `jcr:content`:

```xml
<cq:LiveSyncConfig
    jcr:primaryType="cq:LiveSync"
    cq:master="/content/adkstvite/us/en"
    cq:isDeep="{Boolean}true"
    cq:rolloutConfigs="[/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard]"/>
```

`cq:isDeep=true` ensures rollout cascades to child pages. Without it, only the direct page rolls out, not `home/jcr:content/root/…` descendants.

---

## Inheritance cancellation (localisation)

When you set a property directly on a Live Copy node, MSM automatically records that that property's inheritance is **cancelled**. Subsequent rollouts from master leave it alone.

For this project, cancelled properties include all translated text — for example on the French home page:

```
/content/adkstvite/fr/fr/home/jcr:content/root/container/hero-mount
  headline       = "Votre prochaine grande aventure vous attend"   ← cancelled
  headlineAccent = "Votre aventure"                                ← cancelled
  subheadline    = "Des expériences de voyage soigneusem…"         ← cancelled
```

Properties that are **not** cancelled (e.g. `sling:resourceType`, layout flags) remain inherited and will be updated by rollouts.

---

## Experience Fragments and locale auto-swap

The travel-page template's `structure/.content.xml` locks this XF reference into every page:

```xml
<header-xf
    sling:resourceType="adkstvite/components/experiencefragment"
    fragmentVariationPath="/content/experience-fragments/adkstvite/us/en/site/header/master"/>
```

The path hardcodes `us/en`. Core Components XF v2 reads the **requesting page's locale** at render time and replaces the locale segment:

```
Requesting page: /content/adkstvite/fr/fr/home
XF config path:  /content/experience-fragments/adkstvite/us/en/site/header/master
                                                              ↑   ↑
                         Core XF auto-swaps these two segments to fr/fr
Resolved path:   /content/experience-fragments/adkstvite/fr/fr/site/header/master
```

If no `fr/fr` XF exists, Core XF falls back to the configured `us/en` path. No code change or per-locale template duplication is needed.

### Locale XF structure

```
/content/experience-fragments/adkstvite/
├── us/en/site/
│   ├── header/master/   brandName="AdventureTrails", signInLabel="Sign In"
│   └── footer/master/   tagline="Connecting adventurers…"
│
├── fr/fr/site/
│   ├── header/master/   signInLabel="Se connecter", registerLabel="S'inscrire"
│   │                    navItems: "Accueil", "À propos"
│   └── footer/master/   tagline="Connecter les aventuriers…"
│                         quickLinks: "Accueil", "À propos", "Se connecter", "S'inscrire"
│
└── es/es/site/
    ├── header/master/   signInLabel="Iniciar sesión", registerLabel="Registrarse"
    │                    navItems: "Inicio", "Acerca de"
    └── footer/master/   tagline="Conectando aventureros…"
                          quickLinks: "Inicio", "Acerca de", "Iniciar sesión", "Registrarse"
```

All three reference the same `travel-header` / `travel-footer` `sling:resourceType`. The React components are identical — only the `data-*` attribute values differ.

---

## Translation rules (`translation_rules.xml`)

File: `ui.apps/src/main/content/jcr_root/apps/adkstvite/i18n/translation_rules.xml`

Declares which JCR properties of each component should be extracted by the AEM Translation Framework:

| Component                            | Translatable properties                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `adkstvite/components/page`          | `jcr:title`, `jcr:description`, `pageTitle`, `navTitle`          |
| `adkstvite/components/travel-header` | `brandName`, `signInLabel`, `registerLabel`, `label` (nav items) |
| `adkstvite/components/travel-footer` | `brandName`, `tagline`, `label` (quick links + destinations)     |
| `adkstvite/components/travel-hero`   | `title`, `subtitle`, `ctaLabel`, `secondaryCtaLabel`             |
| `adkstvite/components/text`          | `text`, `richText`                                               |
| `adkstvite/components/title`         | `jcr:title`                                                      |
| `adkstvite/components/image`         | `alt`, `jcr:title`, `jcr:description`                            |
| `adkstvite/components/button`        | `jcr:title`                                                      |

With these rules in place, AEM's **Translation Projects** workflow can extract all text, send it to a translation provider (Microsoft Translator, Google Translate, or a TMS like Lionbridge/Smartling), and write translations back — while MSM's inheritance cancellation ensures they are not overwritten by future rollouts from the English master.

---

## Rolling out master changes

When the US-English (`us/en`) master is updated:

1. In AEM Sites console, select the master page (or `/content/adkstvite/us/en`).
2. Click **Rollout** (or **Rollout → Deep Rollout** for subtrees).
3. Select target live copies: `fr/fr`, `es/es`.
4. AEM runs `adkstvite-standard` rollout actions — `contentUpdate` syncs non-cancelled properties, `referencesUpdate` rewrites any internal links to the target locale path.
5. Cancelled properties (all translated text) are left untouched.

### What propagates vs. what stays

| Change type                   | Propagates?              | Notes                                                 |
| ----------------------------- | ------------------------ | ----------------------------------------------------- |
| New component added to master | ✅ Yes (`contentCopy`)   | Appears in live copy in English; translate separately |
| Component deleted from master | ✅ Yes (`contentDelete`) | Removed from live copies                              |
| `sling:resourceType` change   | ✅ Yes                   | Not cancelled — structural                            |
| `jcr:title` (page metadata)   | ❌ No                    | Cancelled when translation was applied                |
| Hero `headline`               | ❌ No                    | Cancelled when translation was applied                |
| Layout / grid properties      | ✅ Yes                   | Not cancelled                                         |

---

## Adding a new locale

1. Create parent page `/content/adkstvite/de` in Sites console.
2. Run createLiveCopy:
   ```
   POST /bin/wcmcommand
     cmd=createLiveCopy
     srcPath=/content/adkstvite/us/en
     destPath=/content/adkstvite/de
     label=de
     excludeSubPages=false
     rolloutConfigs=/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard
   ```
3. Set `jcr:language=de` on `/content/adkstvite/de/de/jcr:content`.
4. Create XF variations at `/content/experience-fragments/adkstvite/de/de/site/header/master` and `.../footer/master` with German labels.
5. Add to `filter.xml`:
   ```xml
   <filter root="/content/adkstvite" mode="replace">
       ...
       <exclude pattern="/content/adkstvite/de(/.*)?"/>
   </filter>
   <filter root="/content/adkstvite/de/de/destinations" mode="merge"/>
   ```
6. Translate page properties and component content via Sling POST or AEM Translation Project.

---

## Known issues encountered during setup

| Issue                                                               | Root cause                                                                              | Fix                                                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `cq:LiveSyncConfig is not a mixin type`                             | `cq:LiveSyncConfig` is a **node type** (child node), not a mixin                        | Removed from `jcr:mixinTypes`; it's added automatically by `createLiveCopy`                                                        |
| `cq:RolloutConfig not allowed as child of nt:folder`                | Rollout config was parented under a plain folder                                        | Declared as `cq:Page` with `cq:RolloutConfig` as `jcr:content` type                                                                |
| Live copies had no children after manual XML creation               | `cq:master` property alone doesn't copy the tree                                        | Used `POST /bin/wcmcommand cmd=createLiveCopy excludeSubPages=false`                                                               |
| Live copy children wiped on next `mvn install`                      | `/content/adkstvite` filter was `replace` with no exclusions                            | Split filter: `us/en` replace + `fr/`, `es/` excluded from replace + separate merge filters                                        |
| Sling POST to translate returned `409 repository state conflicting` | MSM blocks direct property writes before the full live copy relationship is established | Worked once live copy was correctly created via `createLiveCopy`; MSM then allows property override which auto-cancels inheritance |
| French/Spanish home showed US-English header                        | XF locale auto-swap requires an XF to actually exist at the target locale path          | Created `fr/fr/site/header/master` and `es/es/site/header/master` XF pages                                                         |

---

## Files in source control

### `ui.content`

| Path                                                                                    | Purpose                                        |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard/.content.xml`            | Custom rollout config                          |
| `conf/adkstvite/settings/wcm/templates/travel-page/structure/.content.xml`              | Template structure with locked XF refs         |
| `conf/adkstvite/settings/wcm/templates/travel-page/initial/.content.xml`                | Empty `main-content` for new pages             |
| `conf/adkstvite/settings/wcm/templates/travel-page/policies/.content.xml`               | Travel-only component policy mapping           |
| `content/adkstvite/us/en/**`                                                            | English master pages (fully source-controlled) |
| `content/adkstvite/fr/fr/destinations/**`                                               | Source-managed French destinations subtree     |
| `content/adkstvite/es/es/destinations/**`                                               | Source-managed Spanish destinations subtree    |
| `content/experience-fragments/adkstvite/us/en/site/{header,footer}/master/.content.xml` | English XFs                                    |
| `content/experience-fragments/adkstvite/fr/fr/site/{header,footer}/master/.content.xml` | French XFs                                     |
| `content/experience-fragments/adkstvite/es/es/site/{header,footer}/master/.content.xml` | Spanish XFs                                    |
| `META-INF/vault/filter.xml`                                                             | VLT filter with replace/merge split            |

### `ui.apps`

| Path                                        | Purpose                                        |
| ------------------------------------------- | ---------------------------------------------- |
| `apps/adkstvite/i18n/translation_rules.xml` | Declares translatable properties per component |

### Not in source control (runtime-owned by MSM)

- `/content/adkstvite/fr/fr/{home,about-us,sign-in,register}` — created by `createLiveCopy`, translated via Sling POST
- `/content/adkstvite/es/es/{home,about-us,sign-in,register}` — same
