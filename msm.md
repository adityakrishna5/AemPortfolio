# MSM & Multi-Language Implementation

## Overview

This project uses the **Language Copy** pattern — the industry-standard approach used by
enterprise AEM sites (Marriott, NYT, IKEA, etc.) — rather than pure runtime MSM rollout for
translated page content.

---

## Architecture

```
/content/adkstvite/
├── us/en/              ← English master (source-controlled, replace mode)
│   ├── home/
│   ├── about-us/
│   └── destinations/
├── fr/fr/              ← French language copy
│   ├── home/           ← source-controlled language copy (.content.xml in git)
│   └── destinations/   ← source-controlled (merge mode)
└── es/es/              ← Spanish language copy
    ├── home/           ← source-controlled language copy (.content.xml in git)
    └── destinations/   ← source-controlled (merge mode)

/content/experience-fragments/adkstvite/
├── us/en/site/header/master/   ← English XF
├── fr/fr/site/header/master/   ← French XF  ← source-controlled
├── es/es/site/header/master/   ← Spanish XF ← source-controlled
├── us/en/site/footer/master/
├── fr/fr/site/footer/master/   ← source-controlled
└── es/es/site/footer/master/   ← source-controlled
```

---

## What Was Implemented

### 1. Language Copy Pages (not MSM live copies)

**Files created:**

- `ui.content/src/main/content/jcr_root/content/adkstvite/fr/fr/home/.content.xml`
- `ui.content/src/main/content/jcr_root/content/adkstvite/es/es/home/.content.xml`

**Key properties:**

- `jcr:primaryType="cq:Page"` — plain page, no `cq:LiveRelationship` mixin
- `jcr:language="fr"` / `jcr:language="es"` — locale declared on `jcr:content`
- All translatable string properties (headline, subheadline, CTA labels, body paragraphs,
  destination titles/locations) are stored directly in the XML in the target language
- All `href` and `ctaHref` properties point to locale-specific paths (`/content/adkstvite/fr/fr/...`)

**Why no `cq:LiveRelationship`?**
A live copy inherits from the blueprint — any MSM rollout overwrites local changes.
Language copies are fully independent: they share the same page structure as the English master
but have no runtime inheritance link. Translated content survives every deploy.

### 2. XF-Per-Locale for Shared Components (Header & Footer)

**Files:**

- `ui.content/.../fr/fr/site/header/master/.content.xml` — French nav labels, sign-in copy
- `ui.content/.../es/es/site/header/master/.content.xml` — Spanish nav labels
- `ui.content/.../fr/fr/site/footer/master/.content.xml` — French footer tagline, links
- `ui.content/.../es/es/site/footer/master/.content.xml` — Spanish footer

**How locale resolution works (`TravelHeaderModel.java` / `TravelFooterModel.java`):**

```java
// Extract locale from request URI e.g. /content/adkstvite/fr/fr/home.html → "fr/fr"
private static final Pattern LOCALE_PATTERN =
    Pattern.compile("/content/adkstvite/([a-z]{2}/[a-z]{2})/");

// Look up locale XF resource directly — bypasses Core XF auto-swap
private Resource resolveLocaleHeaderResource(ResourceResolver resolver, String locale) {
    String xfPath = "/content/experience-fragments/adkstvite/" + locale
        + "/site/header/master/jcr:content/root/header-mount";
    return resolver.getResource(xfPath);
}
```

This approach:

- Does not rely on Core XF locale auto-swap (which requires page language config to be set up)
- Works identically on author and publish
- Is source-controlled — XF paths are deterministic and never change at runtime

### 3. filter.xml — Content Package Filters

```xml
<!-- English master: fully authoritative, replace on every deploy -->
<filter root="/content/adkstvite" mode="replace">
    <exclude pattern="/content/adkstvite/fr(/.*)?"/>
    <exclude pattern="/content/adkstvite/es(/.*)?"/>
</filter>

<!-- Language copy home pages: replace mode — git is the source of truth -->
<filter root="/content/adkstvite/fr/fr/home" mode="replace"/>
<filter root="/content/adkstvite/es/es/home" mode="replace"/>

<!-- Destination subtrees: merge — runtime-authored child pages are preserved -->
<filter root="/content/adkstvite/fr/fr/destinations" mode="merge"/>
<filter root="/content/adkstvite/es/es/destinations" mode="merge"/>

<!-- All XFs: default (replace) — fully source-controlled -->
<filter root="/content/experience-fragments/adkstvite"/>
```

**replace vs merge:**

| Mode    | Behaviour on deploy                                                       |
| ------- | ------------------------------------------------------------------------- |
| replace | Package content is authoritative — JCR node is fully replaced             |
| merge   | Package content is merged — child nodes not in package are left untouched |

`home` pages use `replace` because all translations live in git.
`destinations` uses `merge` because child destination pages may be authored at runtime.

---

## Language Switcher

**Component:** `ui.frontend/src/main/webpack/components/_travel-header/TravelHeader.tsx`

A globe icon in the header opens a dropdown with EN / FR / ES options. The `switchLocale()`
function rewrites the current path segment:

```ts
const switchLocale = (targetLocale: string) => {
  const localeMap: Record<string, string> = {
    en: "us/en",
    fr: "fr/fr",
    es: "es/es",
  };
  // Replaces /content/adkstvite/{currentLocale}/ with /content/adkstvite/{targetLocale}/
};
```

---

## How MSM Is (and Is Not) Used

| Concern                  | Approach                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Page structure creation  | `createLiveCopy` was used once to create `fr/fr` and `es/es` page trees at AEM startup |
| Page content translation | **Language copies in git** — `.content.xml` per locale, no `cq:LiveRelationship`       |
| Header/footer copy       | **XF-per-locale** — separate Experience Fragment per locale, resolved at render time   |
| Template/policy changes  | Under `/conf/adkstvite` — single source, applies to all locales automatically          |
| Runtime MSM rollout      | **Not used** for content — translations would be overwritten                           |

### Why Not Pure MSM for Content?

MSM is designed for **structural inheritance** (same content across markets/regions).
The moment you need translated string properties, MSM demands `cq:propertyInheritanceCancelled`
on every translatable property — which turns the live copy into a language copy anyway,
but with extra rollout risk and operational overhead.

Enterprise AEM sites (Marriott, NYT, IKEA) use the Translation Integration Framework (TIF):

1. English master authored in AEM
2. Exported as XLIFF to a TMS (Smartling, Lionbridge, SDL WorldServer)
3. TMS returns translated XLIFF
4. AEM writes translations back as **language copies** committed to git
5. MSM live relationship is either never created or detached post-initial-setup

---

## Adding a New Locale

1. **Create home page** — copy `us/en/home/.content.xml` to `{cc}/{lang}/home/.content.xml`,
   set `jcr:language="{lang}"`, translate all string properties, update all `href` values.
2. **Create XFs** — add header and footer XF files under
   `content/experience-fragments/adkstvite/{cc}/{lang}/site/`.
3. **Update filter.xml**:
   ```xml
   <filter root="/content/adkstvite/{cc}/{lang}/home" mode="replace"/>
   <filter root="/content/adkstvite/{cc}/{lang}/destinations" mode="merge"/>
   ```
4. **Update language switcher** — add the new locale to the dropdown in `TravelHeader.tsx`.
5. **Deploy**: `mvn clean install -PautoInstallSinglePackage`
