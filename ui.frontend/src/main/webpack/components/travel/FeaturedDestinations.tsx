import React from 'react';

interface DestinationItem {
  title: string;
  location: string;
  description: string;
  image: string;
  href: string;
  tag: string;
}

interface FeaturedDestinationsProps {
  overline?: string;
  heading?: string;
  description?: string;
  destinationsJson?: string;
  exploreTripLabel?: string;
}

const DEFAULT_DESTINATIONS: DestinationItem[] = [
  {
    title: 'Mont Blanc Ski Touring',
    location: 'Chamonix, French Alps',
    description: 'Tackle iconic high-altitude ski routes across the roof of Europe. Glaciers, couloirs, and jaw-dropping panoramas await at every ridge.',
    image: '/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-273139829.jpeg',
    href: '/content/adkstvite/us/en/about-us.html',
    tag: 'Alpine',
  },
  {
    title: 'Outback River Camp',
    location: 'Western Australia',
    description: 'Sleep under a blanket of stars beside ancient rivers. Explore red gorges, swim in crystal rockpools, and hear the wild call of the outback.',
    image: '/content/dam/wknd-shared/en/adventures/riverside-camping-australia/adobestock-167833331.jpeg',
    href: '/content/adkstvite/us/en/about-us.html',
    tag: 'Wilderness',
  },
  {
    title: 'Alpine Summit Trek',
    location: 'Mont Blanc Massif, Italy',
    description: 'Multi-day traverse of legendary alpine terrain — hut-to-hut trails, vertiginous ridgelines, and golden sunsets above the clouds.',
    image: '/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-75620750.jpeg',
    href: '/content/adkstvite/us/en/about-us.html',
    tag: 'Trekking',
  },
];

function tryParseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

const FeaturedDestinations: React.FC<FeaturedDestinationsProps> = ({
  overline = 'Where to Next',
  heading = 'Featured Destinations',
  description = 'Handpicked expeditions for the bold and the curious — every destination is vetted by our expert adventure team.',
  destinationsJson,
  exploreTripLabel = 'Explore trip',
}) => {
  const destinations: DestinationItem[] = destinationsJson
    ? tryParseJson<DestinationItem[]>(destinationsJson, DEFAULT_DESTINATIONS)
    : DEFAULT_DESTINATIONS;

  return (
    <section
      className="py-20 bg-white"
      id="destinations-section"
      aria-labelledby="destinations-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-amber-600 text-sm font-semibold uppercase tracking-widest">
            {overline}
          </span>
          <h2
            id="destinations-heading"
            className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900"
          >
            {heading}
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">{description}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {destinations.map((dest, idx) => (
            <article
              key={dest.title + idx}
              className="group bg-stone-50 rounded-xl shadow-md overflow-hidden hover:shadow-xl border border-stone-100 transition-shadow duration-300"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide bg-amber-700 text-white shadow">
                  {dest.tag}
                </span>
              </div>

              <div className="p-6">
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1 mb-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {dest.location}
                </p>
                <h3 className="text-xl font-bold text-gray-900">{dest.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{dest.description}</p>
                <a
                  href={dest.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  {exploreTripLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;
