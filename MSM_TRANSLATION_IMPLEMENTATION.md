# MSM + Translation Implementation Log

**Project:** Traditional ADKST Vite (AEM 6.5 / AEMaaCS)
**Date:** April 24, 2026
**Scope:** Experience Fragments, Multi-Site Manager (MSM), locale variations, content translation (FR + ES)

---

## 1. Goal

Take the single-locale English AEM site (`/content/adkstvite/us/en`) and:

1. Move header/footer from per-page components → shared **Experience Fragments**
2. Restrict template to Travel-only components
3. Scaffold **MSM Live Copies** for French and Spanish
4. Provide **localized Experience Fragment variations** for header/footer
5. Translate **page content** (hero, about, destinations, forms) for each locale

End state: three language sites sharing structure but serving fully translated UI and content.

---

## 2. Final architecture

```
MASTER (source of truth)
  /content/adkstvite/us/en/{home, about-us, sign-in, register}
        │
        │ cq:LiveRelationship  (MSM rolls out structure)
        ▼
LIVE COPIES
  /content/adkstvite/fr/fr/{home, about-us, sign-in, register}  (jcr:language=fr)
  /content/adkstvite/es/es/{home, about-us, sign-in, register}  (jcr:language=es)
        │
        │ Template references /content/experience-fragments/adkstvite/us/en/…
        │ Core XF v2 auto-swaps to matching locale path at render time
        ▼
LOCALIZED XFs
  /content/experience-fragments/adkstvite/us/en/site/{header,footer}/master   (English)
  /content/experience-fragments/adkstvite/fr/fr/site/{header,footer}/master   (French)
  /content/experience-fragments/adkstvite/es/es/site/{header,footer}/master   (Spanish)
```

---

## 3. Changes by area

### 3.1 Experience Fragments — replaced archetype content

**Master (English):** [ui.content/.../us/en/site/header/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/us/en/site/header/master/.content.xml), [footer/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/us/en/site/footer/master/.content.xml)

- Replaced stock archetype components (`navigation`, `languagenavigation`, `search`, `separator`, `text` with "Copyright 2026…") with single `travel-header` / `travel-footer` mount points.
- Properties: `brandName`, `signInLabel`, `registerLabel`, nav items, quickLinks, topDestinations, `tagline`.

**French variations (NEW):** [fr/fr/site/header/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/fr/fr/site/header/master/.content.xml), [footer/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/fr/fr/site/footer/master/.content.xml)

- Labels: "Accueil", "À propos", "Se connecter", "S'inscrire"
- Quick links + top destinations fully translated

**Spanish variations (NEW):** [es/es/site/header/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/es/es/site/header/master/.content.xml), [footer/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/es/es/site/footer/master/.content.xml)

- Labels: "Inicio", "Acerca de", "Iniciar sesión", "Registrarse"

**Locale resolution:** Core Components XF v2 reads the requesting page's path (`/content/adkstvite/fr/fr/home`), checks the template's `fragmentVariationPath` (points to `us/en`), and auto-substitutes `fr/fr` if a matching XF exists. No code or config change required for this behavior.

### 3.2 Template — [travel-page](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page)

Structure now has three direct children of `root`:

| Node           | Role                          | Editable    |
| -------------- | ----------------------------- | ----------- |
| `header-xf`    | Experience Fragment reference | ❌ Locked   |
| `main-content` | Page-specific container       | ✅ Editable |
| `footer-xf`    | Experience Fragment reference | ❌ Locked   |

Files:

- [structure/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page/structure/.content.xml)
- [initial/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page/initial/.content.xml) — empty `main-content`
- [policies/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page/policies/.content.xml) — `root` + `main-content` → `policy_travel_only`; `header-xf` → `policy_header`; `footer-xf` → `policy_footer`

### 3.3 Policies — [policies/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/policies/.content.xml)

Added `policy_travel_only` with `components=[group:Travel]` so authors only see Travel-branded components in the template editor.

### 3.4 MSM rollout config — [adkstvite-standard](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard/.content.xml)

```
cq:Page
  jcr:content (cq:RolloutConfig)
    triggers=rollout
    chains=[StandardRolloutConfig]
```

### 3.5 Live Copies — created via MSM at runtime

Created via `POST /bin/wcmcommand` with `cmd=createLiveCopy`:

- `/content/adkstvite/fr/fr` — `cq:master=/content/adkstvite/us/en`, `jcr:language=fr`
- `/content/adkstvite/es/es` — `cq:master=/content/adkstvite/us/en`, `jcr:language=es`

Both inherit `cq:rolloutConfigs=/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard` and `cq:isDeep=true` (so future master edits rollout to descendants too). Mixins: `cq:LiveRelationship`, `cq:LiveSync`.

**Not source-controlled** — live copies are runtime-owned by MSM. Source XML for `fr/` and `es/` was removed from `ui.content`.

### 3.6 Filter split — [ui.content/.../filter.xml](ui.content/src/main/content/META-INF/vault/filter.xml)

```xml
<filter root="/content/adkstvite" mode="replace">
    <exclude pattern="/content/adkstvite/fr(/.*)?"/>
    <exclude pattern="/content/adkstvite/es(/.*)?"/>
</filter>
<filter root="/content/adkstvite/fr" mode="merge"/>
<filter root="/content/adkstvite/es" mode="merge"/>
```

Why: `us/en` stays source-controlled with `replace` semantics (install wipes + recreates). Live copies `fr/` and `es/` use `merge` mode so runtime MSM children are preserved across `mvn install`.

Also changed XF filter from `merge` → `replace` to ensure old archetype XF content (`navigation`, `separator`, `text` with stale copyright) gets purged on install.

### 3.7 Translation rules — [ui.apps/.../translation_rules.xml](ui.apps/src/main/content/jcr_root/apps/adkstvite/i18n/translation_rules.xml)

Declares which JCR properties of each component are translatable. Used by AEM Translation Framework when integrating with Microsoft Translator / Google Translate / TMS vendors (Lionbridge, Smartling, etc.). Covers:

- `adkstvite/components/page` → `jcr:title`, `pageTitle`, `navTitle`, `jcr:description`
- `adkstvite/components/travel-header` → `brandName`, `signInLabel`, `registerLabel`, inherited `label`
- `adkstvite/components/travel-footer` → `brandName`, `tagline`, inherited `label`
- `adkstvite/components/travel-hero` → `title`, `subtitle`, `ctaLabel`, `secondaryCtaLabel`
- Core Component text/title/image/button

### 3.8 Page-level translations (Sling POST, runtime)

All properties set directly on the live copy nodes. Doing so automatically cancels inheritance per-property, so future master rollouts won't overwrite translations.

**Per-page metadata** (all 4 pages × 2 locales):

| Property    | FR example                  | ES example                 |
| ----------- | --------------------------- | -------------------------- |
| `jcr:title` | "Accueil"                   | "Inicio"                   |
| `pageTitle` | "AdventureTrails — Accueil" | "AdventureTrails — Inicio" |
| `navTitle`  | "Accueil"                   | "Inicio"                   |

**Hero section** (`home/…/hero-mount`): headline, headlineAccent, subheadline, badgeText, cta1Label, cta2Label
**About section** (`home + about-us/…/about-mount`): overline, headline, headlineAccent, para1, para2, ctaLabel, stat1-4Label
**Destinations** (`home + about-us/…/destinations-mount`): overline, heading, description + 3 item entries (title, location, tag, description)
**Sign-in form** (`sign-in/…/signin-mount`): heading, description
**Register form** (`register/…/register-mount`): heading, description

---

## 4. Verification

Rendered HTML output confirmed end-to-end:

| URL                                  | `<html lang>` | `<title>` | Sign In label    | Tagline prefix               |
| ------------------------------------ | ------------- | --------- | ---------------- | ---------------------------- |
| `/content/adkstvite/us/en/home.html` | `en`          | Home      | "Sign In"        | "Connecting adventurers…"    |
| `/content/adkstvite/fr/fr/home.html` | `fr`          | Accueil   | "Se connecter"   | "Connecter les aventuriers…" |
| `/content/adkstvite/es/es/home.html` | `es`          | Inicio    | "Iniciar sesión" | "Conectando aventureros…"    |

Hero headline samples:

- EN: "Your Next Great Adventure Awaits"
- FR: "Votre prochaine grande aventure vous attend"
- ES: "Tu próxima gran aventura te espera"

Form headings:

- FR sign-in: "Connectez-vous à votre compte"
- ES register: "Crea tu cuenta"

---

## 5. Issues encountered & resolutions

| #   | Issue                                                                                | Root cause                                                                                                                                  | Fix                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Old "Copyright 2026, Traditional ADKST Vite…" rendered in footer despite XML updates | XF filter used `mode="merge"` — install merged new nodes but didn't remove archetype defaults (`separator`, `text`, `navigation`, `search`) | Changed filter to `replace` mode for `/content/experience-fragments/adkstvite` and redeployed                                                                                   |
| 2   | `cq:LiveSyncConfig is not a mixin type` during install                               | `cq:LiveSyncConfig` is a JCR **node type** (used for `cq:LiveSync` child config), not a mixin                                               | Removed from `jcr:mixinTypes`; kept only `cq:LiveRelationship`                                                                                                                  |
| 3   | `cq:RolloutConfig not allowed as child of nt:folder`                                 | Rollout config was declared as a folder child                                                                                               | Declared rollout config as `cq:Page` with `cq:RolloutConfig` on `jcr:content`                                                                                                   |
| 4   | Live copies had no children after MSM create                                         | Manual XML-based Live Copy roots had `cq:master` but no actual live relationship — rollout syncs existing pages, doesn't create new ones    | Used `POST /bin/wcmcommand cmd=createLiveCopy` with `excludeSubPages=false` which establishes the relationship AND copies the full tree                                         |
| 5   | Live copy children wiped on next `mvn install`                                       | `/content/adkstvite` filter was `replace` mode                                                                                              | Split filter: `us/en` replace + `fr/`, `es/` merge                                                                                                                              |
| 6   | Sling POST to set page title returned `409 repository state conflicting`             | MSM blocks overrides on inherited properties by default                                                                                     | Setting properties via admin user on a full Live Copy implicitly cancels per-property inheritance — confirmed working once Live Copy was correctly created via `createLiveCopy` |
| 7   | First attempt at sign-in/register translation created orphan `form-mount` nodes      | Wrong node names — actual components are `signin-mount` and `register-mount`                                                                | Deleted orphans, re-targeted correct paths                                                                                                                                      |

---

## 6. What's NOT translated (intentional)

- **`brandName` = "AdventureTrails"** — brand term, stays English across all locales
- **`stat*Value`** = "12k", "48", "98%", "14" — numeric values
- **`href`** paths — already locale-correct (`/content/adkstvite/fr/fr/…`)
- **DAM assets** — images shared across locales (no locale-specific folder yet)

---

## 7. Operational notes

### Rolling out master changes

When `us/en/*` pages change, from the Sites console:

- Select master page → **Rollout** → choose `fr/fr`, `es/es` → Rollout
- Properties with cancelled inheritance (titles, hero text, etc.) remain untouched
- Only structural changes and non-cancelled properties propagate

### Adding a new locale (e.g., German)

1. Create parent page `/content/adkstvite/de`
2. `POST /bin/wcmcommand cmd=createLiveCopy srcPath=/content/adkstvite/us/en destPath=/content/adkstvite/de label=de excludeSubPages=false rolloutConfigs=/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard`
3. Set `jcr:language=de` on `/content/adkstvite/de/de/jcr:content`
4. Create XF variations at `/content/experience-fragments/adkstvite/de/de/site/{header,footer}/master`
5. Add `<filter root="/content/adkstvite/de" mode="merge"/>` and exclude from parent replace filter
6. Translate via Sling POST or editor

### Enabling automated translation

`translation_rules.xml` is already in place. To wire up machine translation:

1. Configure translation cloud service under `/libs/settings/translation/cloudconfigs/translationcfg`
2. Create Translation Project under `/content/projects` targeting `fr/fr` or `es/es`
3. AEM extracts properties declared in `translation_rules.xml`, sends to provider, writes translations back — all while respecting MSM inheritance cancellation

---

## 8. Files changed summary

### Created

- French XF tree — [header master](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/fr/fr/site/header/master/.content.xml), [footer master](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/fr/fr/site/footer/master/.content.xml)
- Spanish XF tree — [header master](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/es/es/site/header/master/.content.xml), [footer master](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/es/es/site/footer/master/.content.xml)
- MSM rollout config — [adkstvite-standard/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/msm/rolloutconfigs/adkstvite-standard/.content.xml)
- Translation rules — [translation_rules.xml](ui.apps/src/main/content/jcr_root/apps/adkstvite/i18n/translation_rules.xml)

### Modified

- [filter.xml](ui.content/src/main/content/META-INF/vault/filter.xml) — split filter for MSM-friendly install
- [us/en/site/header/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/us/en/site/header/master/.content.xml) — replaced archetype content with `travel-header`
- [us/en/site/footer/master/.content.xml](ui.content/src/main/content/jcr_root/content/experience-fragments/adkstvite/us/en/site/footer/master/.content.xml) — replaced archetype content with `travel-footer`
- [travel-page/structure/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page/structure/.content.xml) — XF refs + editable main-content
- [travel-page/policies/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/templates/travel-page/policies/.content.xml) — Travel-only policy
- [policies/.content.xml](ui.content/src/main/content/jcr_root/conf/adkstvite/settings/wcm/policies/.content.xml) — added `policy_travel_only`
- Page content cleaned — [home](ui.content/src/main/content/jcr_root/content/adkstvite/us/en/home/.content.xml), [about-us](ui.content/src/main/content/jcr_root/content/adkstvite/us/en/about-us/.content.xml), [sign-in](ui.content/src/main/content/jcr_root/content/adkstvite/us/en/sign-in/.content.xml), [register](ui.content/src/main/content/jcr_root/content/adkstvite/us/en/register/.content.xml) — removed inline header/footer blocks

### Runtime-only (not in source)

- `/content/adkstvite/fr/fr/{home,about-us,sign-in,register}` — created via MSM, translated via Sling POST
- `/content/adkstvite/es/es/{home,about-us,sign-in,register}` — created via MSM, translated via Sling POST
