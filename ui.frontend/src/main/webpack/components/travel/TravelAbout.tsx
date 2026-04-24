import React from 'react';

interface TravelAboutProps {
  aboutImage?: string;
  overline?: string;
  headline?: string;
  headlineAccent?: string;
  para1?: string;
  para2?: string;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const TravelAbout: React.FC<TravelAboutProps> = ({
  aboutImage = '/content/dam/wknd-shared/en/adventures/ski-touring-mont-blanc/adobestock-222643220.jpeg',
  overline = 'Who We Are',
  headline = 'We Live to Explore',
  headlineAccent = 'the World',
  para1 = 'AdventureTrails was founded by a group of passionate explorers who believed that travel should be transformative — not just a vacation, but a life-changing experience. We specialize in curating small-group expeditions to destinations that most travellers only dream about.',
  para2 = "Whether you're chasing arctic waves, scaling volcanic peaks, or trekking through ancient rain forests, our expert local guides ensure every journey is safe, sustainable, and genuinely unforgettable.",
  stat1Value = '60+',   stat1Label = 'Countries',
  stat2Value = '200+',  stat2Label = 'Expeditions Yearly',
  stat3Value = '50K+',  stat3Label = 'Happy Travellers',
  stat4Value = '15',    stat4Label = 'Years of Experience',
  ctaLabel = 'Our Story',
  ctaHref = '/content/adkstvite/us/en/about-us.html',
}) => {
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
    { value: stat4Value, label: stat4Label },
  ];
  return (
    <section className="py-20 bg-stone-50" id="about-section" aria-labelledby="about-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Image column */}
          <div className="relative">
            <img
              src={aboutImage}
              alt="AdventureTrails team in the wild"
              className="rounded-lg shadow-2xl w-full h-[420px] object-cover object-center ring-4 ring-amber-600/20"
            />
            <div className="absolute -bottom-6 -right-6 bg-amber-600 text-white rounded-2xl px-6 py-4 shadow-xl hidden sm:block">
              <p className="text-3xl font-extrabold">{stat4Value}+</p>
              <p className="text-sm font-medium opacity-90">Years of Adventures</p>
            </div>
          </div>

          {/* Text column */}
          <div>
            <span className="text-amber-600 text-sm font-semibold uppercase tracking-widest">
              {overline}
            </span>
            <h2
              id="about-heading"
              className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight"
            >
              {headline}<br />
              <span className="text-amber-600">{headlineAccent}</span>
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed text-base">{para1}</p>
            <p className="mt-4 text-gray-600 leading-relaxed text-base">{para2}</p>

            {/* Stats grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-lg bg-white border border-stone-200 shadow-sm">
                  <p className="text-2xl font-extrabold text-amber-600">{stat.value}</p>
                  <p className="mt-1 text-xs text-gray-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            <a
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow"
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TravelAbout;
