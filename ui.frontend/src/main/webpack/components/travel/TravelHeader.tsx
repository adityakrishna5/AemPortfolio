import React, { useState } from 'react';

interface NavItem { label: string; href: string; }

interface TravelHeaderProps {
  brandName?: string;
  brandHref?: string;
  navItemsJson?: string;
  signInLabel?: string;
  signInHref?: string;
  registerLabel?: string;
  registerHref?: string;
}

function tryParseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

const DEFAULT_NAV: NavItem[] = [
  { label: 'Home', href: '/content/adkstvite/us/en/home.html' },
  { label: 'About Us', href: '/content/adkstvite/us/en/about-us.html' },
];

const TravelHeader: React.FC<TravelHeaderProps> = ({
  brandName = 'AdventureTrails',
  brandHref = '/content/adkstvite/us/en/home.html',
  navItemsJson,
  signInLabel = 'Sign In',
  signInHref = '/content/adkstvite/us/en/sign-in.html',
  registerLabel = 'Register',
  registerHref = '/content/adkstvite/us/en/register.html',
}) => {
  const navLinks: NavItem[] = navItemsJson
    ? tryParseJson<NavItem[]>(navItemsJson, DEFAULT_NAV)
    : DEFAULT_NAV;
  const [menuOpen, setMenuOpen] = useState(false);

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
          <a href={signInHref}
            className="ml-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow">
            {signInLabel}
          </a>
          <a href={registerHref}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-amber-400 border border-amber-500/60 hover:bg-amber-500/10 transition-colors">
            {registerLabel}
          </a>
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
          <a href={signInHref}
            className="block w-full text-center mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 transition-colors"
            onClick={() => setMenuOpen(false)}>{signInLabel}</a>
          <a href={registerHref}
            className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold text-amber-400 border border-amber-500/60 hover:bg-amber-500/10 transition-colors"
            onClick={() => setMenuOpen(false)}>{registerLabel}</a>
        </div>
      )}
    </header>
  );
};

export default TravelHeader;
