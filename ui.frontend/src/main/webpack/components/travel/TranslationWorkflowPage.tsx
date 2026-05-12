import React from 'react';

interface TranslationWorkflowPageProps {
  heading?: string;
  description?: string;
  step1Title?: string;
  step1Desc?: string;
  step2Title?: string;
  step2Desc?: string;
  step3Title?: string;
  step3Desc?: string;
  step4Title?: string;
  step4Desc?: string;
  noteHeading?: string;
  noteBody?: string;
}

const STEP_ICONS = [
  // 1 — copy / duplicate
  <svg key="s1" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>,
  // 2 — document / XLIFF
  <svg key="s2" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
  // 3 — translate / globe
  <svg key="s3" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>,
  // 4 — check / publish
  <svg key="s4" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
];

const TranslationWorkflowPage: React.FC<TranslationWorkflowPageProps> = ({
  heading = 'How AEM Translation Works',
  description = 'A look at how content reaches every language across the AdventureTrails platform.',
  step1Title = 'Language Copy Creation',
  step1Desc = 'Content authors initiate a language copy in AEM Sites. Page structure is replicated to the target locale path without content.',
  step2Title = 'Translation Project',
  step2Desc = 'AEM creates a Translation Project. Content is exported as XLIFF and sent to the connected Translation Management System (TMS).',
  step3Title = 'Human Review',
  step3Desc = 'Language experts review machine or human translations inside the TMS, making corrections before approving the job.',
  step4Title = 'Approval & Publish',
  step4Desc = 'Approved translations are imported back into AEM, reviewed by content editors, and published live to each locale site.',
  noteHeading = 'On this prototype',
  noteBody = 'Because this is a developer prototype, translations are authored directly into the JCR as locale-specific .content.xml files — the same output a real TMS workflow would produce.',
}) => {
  const steps = [
    { title: step1Title, desc: step1Desc, number: 1 },
    { title: step2Title, desc: step2Desc, number: 2 },
    { title: step3Title, desc: step3Desc, number: 3 },
    { title: step4Title, desc: step4Desc, number: 4 },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50" aria-labelledby="tw-heading">
      {/* Hero */}
      <section className="bg-stone-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-400 mb-4 px-3 py-1 rounded-full bg-amber-900/40">
            AEM Translation Integration Framework
          </span>
          <h1 id="tw-heading" className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            {heading}
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        </div>
      </section>

      {/* Workflow pipeline */}
      <section className="py-20 px-4" aria-label="Workflow steps">
        <div className="max-w-5xl mx-auto">
          {/* Desktop: horizontal connector line */}
          <div className="hidden lg:flex items-start gap-0 mb-16 relative">
            <div className="absolute top-10 left-[calc(12.5%+1.75rem)] right-[calc(12.5%+1.75rem)] h-0.5 bg-amber-200 z-0" aria-hidden="true" />
            {steps.map((step, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center px-4 relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-2 border-amber-200 flex items-center justify-center mb-5 text-amber-600">
                  {STEP_ICONS[i]}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">
                  Step {step.number}
                </span>
                <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug">{step.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical */}
          <div className="lg:hidden space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 flex gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  {STEP_ICONS[i]}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-500">Step {step.number}</span>
                  <h2 className="text-base font-bold text-gray-900 mt-0.5 mb-1">{step.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture diagram — static, locale-neutral SVG labels */}
      <section className="bg-stone-900 py-16 px-4" aria-label="Architecture overview">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            {[
              { label: 'AEM Author', sub: '/content/adkstvite/us/en', icon: '📝' },
              { label: 'TMS Connector', sub: 'XLIFF export / import', icon: '⇄' },
              { label: 'Language Sites', sub: '/fr/fr  /es/es  /…', icon: '🌐' },
            ].map((box) => (
              <div key={box.label} className="rounded-xl border border-stone-700 bg-stone-800 p-5">
                <div className="text-3xl mb-2">{box.icon}</div>
                <p className="text-white font-semibold text-sm">{box.label}</p>
                <p className="text-stone-500 text-xs font-mono mt-1">{box.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prototype note */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-1">{noteHeading}</h3>
              <p className="text-amber-800 text-sm leading-relaxed">{noteBody}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default TranslationWorkflowPage;
