/**
 * travel/mount.tsx
 *
 * Mounts every travel React component to its corresponding DOM mount point.
 * Reads authored values from data-* attributes set by Sling Model HTL templates.
 *
 * Supports AEM dialog save: when AEM replaces a component's DOM after a dialog
 * save, a MutationObserver detects the new element and re-mounts React on it,
 * reading the freshly-rendered data-* attributes from HTL.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import TravelHeader from './TravelHeader';
import TravelFooter from './TravelFooter';
import TravelHero from './TravelHero';
import TravelAbout from './TravelAbout';
import FeaturedDestinations from './FeaturedDestinations';
import SignInForm from './SignInForm';
import RegisterForm from './RegisterForm';
import AccountPage from './AccountPage';
import TranslationWorkflowPage from './TranslationWorkflowPage';

const COMPONENT_IDS = [
  'travel-header',
  'travel-footer',
  'travel-hero',
  'travel-about',
  'travel-destinations',
  'travel-signin',
  'travel-register',
  'travel-account',
  'travel-translation-workflow',
] as const;

type ComponentId = typeof COMPONENT_IDS[number];

/** Tracks mounted React roots so we can unmount the old one when AEM replaces the DOM node. */
const roots = new Map<ComponentId, { root: Root; el: HTMLElement }>();

function renderIntoRoot(id: ComponentId, root: Root, el: HTMLElement): void {
  const d = el.dataset;

  switch (id) {
    case 'travel-header':
      root.render(
        <TravelHeader
          brandName={d.brandName}
          brandHref={d.brandHref}
          navItemsJson={d.navItems}
          signInLabel={d.signInLabel}
          signInHref={d.signInHref}
          registerLabel={d.registerLabel}
          registerHref={d.registerHref}
          isAuthenticatedInitial={d.isAuthenticated === 'true'}
          displayNameInitial={d.displayName ?? ''}
          currentLocale={d.currentLocale ?? 'us/en'}
          localesJson={d.locales}
        />
      );
      break;

    case 'travel-footer':
      root.render(
        <TravelFooter
          brandName={d.brandName}
          brandHref={d.brandHref}
          tagline={d.tagline}
          quickLinksJson={d.quickLinks}
          topDestinationsJson={d.topDestinations}
          quickLinksHeading={d.quickLinksHeading}
          topDestinationsHeading={d.topDestinationsHeading}
          newsletterHeading={d.newsletterHeading}
          newsletterDescription={d.newsletterDescription}
          newsletterButtonLabel={d.newsletterButtonLabel}
        />
      );
      break;

    case 'travel-hero':
      root.render(
        <TravelHero
          heroImage={d.heroImage}
          badgeText={d.badgeText}
          headline={d.headline}
          headlineAccent={d.headlineAccent}
          subheadline={d.subheadline}
          cta1Label={d.cta1Label}
          cta1Href={d.cta1Href}
          cta2Label={d.cta2Label}
          cta2Href={d.cta2Href}
        />
      );
      break;

    case 'travel-about':
      root.render(
        <TravelAbout
          aboutImage={d.aboutImage}
          overline={d.overline}
          headline={d.headline}
          headlineAccent={d.headlineAccent}
          para1={d.para1}
          para2={d.para2}
          stat1Value={d.stat1Value}
          stat1Label={d.stat1Label}
          stat2Value={d.stat2Value}
          stat2Label={d.stat2Label}
          stat3Value={d.stat3Value}
          stat3Label={d.stat3Label}
          stat4Value={d.stat4Value}
          stat4Label={d.stat4Label}
          ctaLabel={d.ctaLabel}
          ctaHref={d.ctaHref}
        />
      );
      break;

    case 'travel-destinations':
      root.render(
        <FeaturedDestinations
          overline={d.overline}
          heading={d.heading}
          description={d.description}
          destinationsJson={d.destinations}
          exploreTripLabel={d.exploreLabel}
        />
      );
      break;

    case 'travel-signin':
      root.render(<SignInForm heading={d.heading} description={d.description} />);
      break;

    case 'travel-register':
      root.render(<RegisterForm heading={d.heading} description={d.description} />);
      break;

    case 'travel-account':
      root.render(<AccountPage />);
      break;

    case 'travel-translation-workflow':
      root.render(
        <TranslationWorkflowPage
          heading={d.heading}
          description={d.description}
          step1Title={d.step1Title}
          step1Desc={d.step1Desc}
          step2Title={d.step2Title}
          step2Desc={d.step2Desc}
          step3Title={d.step3Title}
          step3Desc={d.step3Desc}
          step4Title={d.step4Title}
          step4Desc={d.step4Desc}
          noteHeading={d.noteHeading}
          noteBody={d.noteBody}
        />
      );
      break;
  }
}

/**
 * Mount (or re-mount) a single component by ID.
 * If AEM has replaced the DOM node, the old React root is unmounted and a new
 * one is created on the replacement element.
 */
function mountById(id: ComponentId): void {
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el) return;

  const existing = roots.get(id);

  // Same element is already mounted — nothing to do.
  if (existing?.el === el) return;

  // AEM replaced the element (different node) — unmount the stale React root.
  if (existing) {
    try { existing.root.unmount(); } catch (_) { /* already unmounted */ }
  }

  const root = createRoot(el);
  roots.set(id, { root, el });
  renderIntoRoot(id, root, el);
}

function mountAll(): void {
  COMPONENT_IDS.forEach(mountById);
}

// ─── Initial mount ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  mountAll();

  // ─── AEM dialog-save re-mount ─────────────────────────────────────────────
  // After a dialog save, AEM fetches fresh component HTML and replaces the
  // existing DOM node.  The MutationObserver detects the new element appearing
  // in the document and re-mounts React on it with the updated data-* attrs.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;

        // Direct match (AEM inserted the mount div itself).
        if (COMPONENT_IDS.includes(node.id as ComponentId)) {
          mountById(node.id as ComponentId);
        }

        // Descendant match (AEM inserted a wrapper that contains the mount div).
        COMPONENT_IDS.forEach((id) => {
          if (node.querySelector(`#${id}`)) {
            mountById(id);
          }
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
