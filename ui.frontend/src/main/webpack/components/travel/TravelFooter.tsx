import React from 'react';

interface LinkItem { label: string; href: string; }

interface TravelFooterProps {
  brandName?: string;
  brandHref?: string;
  tagline?: string;
  quickLinksJson?: string;
  topDestinationsJson?: string;
}

function tryParseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

const DEFAULT_QUICK_LINKS: LinkItem[] = [
  { label: 'Home', href: '/content/adkstvite/us/en/home.html' },
  { label: 'About Us', href: '/content/adkstvite/us/en/about-us.html' },
  { label: 'Sign In', href: '/content/adkstvite/us/en/sign-in.html' },
  { label: 'Register', href: '/content/adkstvite/us/en/register.html' },
];

const DEFAULT_TOP_DESTINATIONS: LinkItem[] = [
  { label: 'Arctic Surfing, Norway', href: '/content/adkstvite/us/en/about-us.html' },
  { label: 'Svalbard Trekking', href: '/content/adkstvite/us/en/about-us.html' },
  { label: 'Iceland Ring Road', href: '/content/adkstvite/us/en/about-us.html' },
  { label: 'Scottish Highlands', href: '/content/adkstvite/us/en/about-us.html' },
  { label: 'Patagonia Crossing', href: '/content/adkstvite/us/en/about-us.html' },
];

const TravelFooter: React.FC<TravelFooterProps> = ({
  brandName = 'AdventureTrails',
  brandHref = '/content/adkstvite/us/en/home.html',
  tagline = 'Connecting adventurers with extraordinary destinations since 2010. Every trip is a story waiting to be written.',
  quickLinksJson,
  topDestinationsJson,
}) => {
  const quickLinks: LinkItem[] = quickLinksJson
    ? tryParseJson<LinkItem[]>(quickLinksJson, DEFAULT_QUICK_LINKS)
    : DEFAULT_QUICK_LINKS;
  const destinations: LinkItem[] = topDestinationsJson
    ? tryParseJson<LinkItem[]>(topDestinationsJson, DEFAULT_TOP_DESTINATIONS)
    : DEFAULT_TOP_DESTINATIONS;
  return (
  <footer className="bg-stone-950 text-stone-400" aria-label="Site footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        <div>
          <a href={brandHref}
            className="inline-flex items-center gap-2 text-xl font-bold text-amber-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {brandName}
          </a>
          <p className="text-sm text-stone-500 leading-relaxed">
            {tagline}
          </p>
          <div className="flex gap-4 mt-5">
            {['instagram', 'twitter', 'facebook'].map((social) => (
              <a key={social} href="#" aria-label={`Follow us on ${social}`}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-stone-800 hover:bg-amber-600 transition-colors">
                <span className="text-xs font-bold capitalize text-stone-400">
                  {social[0].toUpperCase()}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-200 mb-4">Quick Links</h3>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="text-sm text-stone-500 hover:text-amber-400 transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-200 mb-4">Top Destinations</h3>
          <ul className="space-y-2">
            {destinations.map((dest) => (
              <li key={dest.label}>
                <a href={dest.href}
                  className="text-sm text-stone-500 hover:text-amber-400 transition-colors">
                  {dest.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-200 mb-4">Stay Connected</h3>
          <p className="text-sm text-stone-500 mb-4">Get expedition updates and travel inspiration in your inbox.</p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()} aria-label="Newsletter signup">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input id="footer-email" type="email" placeholder="you@email.com" required
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"/>
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors">
              Go
            </button>
          </form>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600">
        <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-stone-400 transition-colors">Cookie Policy</a>
        </div>
      </div>
    </div>
  </footer>
  );
};

export default TravelFooter;
