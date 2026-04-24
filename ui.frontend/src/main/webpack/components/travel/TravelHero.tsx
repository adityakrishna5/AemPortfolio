import React from 'react';

interface TravelHeroProps {
  heroImage?: string;
  badgeText?: string;
  headline?: string;
  headlineAccent?: string;
  subheadline?: string;
  cta1Label?: string;
  cta1Href?: string;
  cta2Label?: string;
  cta2Href?: string;
}

const TravelHero: React.FC<TravelHeroProps> = ({
  heroImage = '/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-238230356.jpeg',
  badgeText = 'Explore the world',
  headline = 'Discover Your',
  headlineAccent = 'Next Adventure',
  subheadline = "From arctic waves to alpine peaks, we connect adventurers with the world's most extraordinary destinations — curated experiences, expert guides, unforgettable memories.",
  cta1Label = 'Explore Destinations',
  cta1Href = '/content/adkstvite/us/en/about-us.html',
  cta2Label = 'Join for Free',
  cta2Href = '/content/adkstvite/us/en/register.html',
}) => (
  <section
    className="relative h-screen min-h-[600px] flex items-center justify-center text-white"
    aria-label="Hero banner"
  >
    <img
      src={heroImage}
      alt={`${headline} ${headlineAccent} — adventure travel`}
      className="absolute inset-0 w-full h-full object-cover object-center"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-amber-950/30 to-stone-950/80" />

    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
      <span className="inline-block mb-4 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest bg-amber-600/90 text-white border border-amber-500/50">
        {badgeText}
      </span>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
        {headline}<br />
        <span className="text-amber-400">{headlineAccent}</span>
      </h1>
      <p className="mt-6 text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
        {subheadline}
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={cta1Href}
          className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-bold bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-lg"
        >
          {cta1Label}
        </a>
        <a
          href={cta2Href}
          className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-bold border-2 border-amber-400/60 text-amber-100 hover:bg-amber-600/20 transition-colors"
        >
          {cta2Label}
        </a>
      </div>
    </div>

    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
      <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </section>
);

export default TravelHero;
