import React, { useState, useEffect, useRef } from 'react';
import { logout, getUserInfo } from './auth/authService';

interface NavItem { label: string; href: string; }
interface Locale { code: string; label: string; displayName: string; }

interface TravelHeaderProps {
  brandName?: string;
  brandHref?: string;
  navItemsJson?: string;
  signInLabel?: string;
  signInHref?: string;
  registerLabel?: string;
  registerHref?: string;
  /** Server-resolved auth state from Sling Model — eliminates auth flash */
  isAuthenticatedInitial?: boolean;
  displayNameInitial?: string;
  /** Current locale code e.g. "us/en", "fr/fr", "es/es" */
  currentLocale?: string;
  /** JSON array of available locales */
  localesJson?: string;
}

function tryParseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

const DEFAULT_NAV: NavItem[] = [
  { label: 'Home', href: '/content/adkstvite/us/en/home.html' },
  { label: 'About Us', href: '/content/adkstvite/us/en/about-us.html' },
];

const DEFAULT_LOCALES: Locale[] = [
  { code: 'us/en', label: 'EN', displayName: 'English' },
  { code: 'fr/fr', label: 'FR', displayName: 'Français' },
  { code: 'es/es', label: 'ES', displayName: 'Español' },
];

/** Replaces the locale segment in an AEM path: /content/adkstvite/{country}/{lang}/... */
function switchLocale(targetCode: string): void {
  const newPath = globalThis.location.pathname.replace(
    /\/content\/adkstvite\/[a-z]{2}\/[a-z]{2}\//,
    `/content/adkstvite/${targetCode}/`
  );
  if (newPath === globalThis.location.pathname) {
    globalThis.location.href = `/content/adkstvite/${targetCode}/home.html`;
  } else {
    globalThis.location.href = newPath;
  }
}

const LanguageSwitcher: React.FC<{ current: string; locales: Locale[]; mobile?: boolean }> = ({
  current, locales, mobile = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale = locales.find((l) => l.code === current) ?? locales[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (mobile) {
    return (
      <div className="border-t border-stone-700 pt-3 mt-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-1">Language</p>
        {locales.map((locale) => (
          <button
            key={locale.code}
            type="button"
            onClick={() => switchLocale(locale.code)}
            className={`block w-full text-left py-2 px-1 text-sm font-medium rounded transition-colors ${
              locale.code === current
                ? 'text-amber-400'
                : 'text-stone-300 hover:text-amber-400'
            }`}
          >
            <span className="mr-2 font-bold">{locale.label}</span>{locale.displayName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold text-stone-300 hover:text-amber-400 border border-stone-600 hover:border-amber-500/60 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
        </svg>
        {currentLocale.label}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-36 rounded-lg shadow-xl bg-stone-800 border border-stone-700 py-1 z-50"
        >
          {locales.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => { setOpen(false); switchLocale(locale.code); }}
              aria-current={locale.code === current ? 'true' : undefined}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                locale.code === current
                  ? 'text-amber-400 bg-stone-700/50 font-semibold'
                  : 'text-stone-300 hover:text-amber-400 hover:bg-stone-700/30'
              }`}
            >
              <span className="w-6 font-bold text-xs">{locale.label}</span>
              {locale.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TravelHeader: React.FC<TravelHeaderProps> = ({
  brandName = 'AdventureTrails',
  brandHref = '/content/adkstvite/us/en/home.html',
  navItemsJson,
  signInLabel = 'Sign In',
  signInHref = '/content/adkstvite/us/en/sign-in.html',
  registerLabel = 'Register',
  registerHref = '/content/adkstvite/us/en/register.html',
  isAuthenticatedInitial = false,
  displayNameInitial = '',
  currentLocale = 'us/en',
  localesJson,
}) => {
  const navLinks: NavItem[] = navItemsJson
    ? tryParseJson<NavItem[]>(navItemsJson, DEFAULT_NAV)
    : DEFAULT_NAV;
  const locales: Locale[] = localesJson
    ? tryParseJson<Locale[]>(localesJson, DEFAULT_LOCALES)
    : DEFAULT_LOCALES;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isAuthenticatedInitial);
  const [displayName, setDisplayName] = useState(displayNameInitial || 'Account');

  // If the server baked in authenticated=true, trust it. Otherwise verify
  // client-side — catches stale cached HTML served after login/logout.
  useEffect(() => {
    if (isAuthenticatedInitial) return; // already correct from server
    getUserInfo().then((user) => {
      if (user) {
        setIsAuthenticated(true);
        setDisplayName(user.name ?? user.email ?? 'Account');
      }
    }).catch(() => { /* stay unauthenticated */ });
  }, [isAuthenticatedInitial]);

  const handleSignOut = async () => {
    await logout();
    globalThis.location.href = brandHref;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-stone-900/95 backdrop-blur shadow-lg border-b border-stone-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <a href={brandHref}
          className="flex items-center gap-2 text-xl font-bold text-amber-400 tracking-tight">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {brandName}
        </a>

        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href}
              className="text-sm font-medium text-stone-300 hover:text-amber-400 transition-colors">
              {link.label}
            </a>
          ))}
          <LanguageSwitcher current={currentLocale} locales={locales} />
          {isAuthenticated ? (
            <>
              <a
                href="/content/adkstvite/us/en/account.html"
                className="text-sm font-medium text-stone-300 hover:text-amber-400 transition-colors">
                {displayName}
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a href={signInHref}
                className="ml-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow">
                {signInLabel}
              </a>
              <a href={registerHref}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-amber-400 border border-amber-500/60 hover:bg-amber-500/10 transition-colors">
                {registerLabel}
              </a>
            </>
          )}
        </nav>

        <button type="button"
          className="md:hidden p-2 rounded-md text-stone-400 hover:text-amber-400 hover:bg-stone-800"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}>
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-stone-700 bg-stone-900 px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href}
              className="block py-2 text-base font-medium text-stone-300 hover:text-amber-400"
              onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          {isAuthenticated ? (
            <>
              <a
                href="/content/adkstvite/us/en/account.html"
                className="block w-full text-center mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:text-amber-400 transition-colors"
                onClick={() => setMenuOpen(false)}>
                {displayName}
              </a>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); void handleSignOut(); }}
                className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a href={signInHref}
                className="block w-full text-center mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors"
                onClick={() => setMenuOpen(false)}>{signInLabel}</a>
              <a href={registerHref}
                className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold text-amber-400 border border-amber-500/60 hover:bg-amber-500/10 transition-colors"
                onClick={() => setMenuOpen(false)}>{registerLabel}</a>
            </>
          )}
          <LanguageSwitcher current={currentLocale} locales={locales} mobile />
        </div>
      )}
    </header>
  );
};

export default TravelHeader;
