import { getServerT } from '@/lib/server-i18n';

export default async function HomeFaqSection() {
  const t = await getServerT();
  const faqs = [
    { q: t('home.faq_q1'), a: t('home.faq_a1') },
    { q: t('home.faq_q2'), a: t('home.faq_a2') },
    { q: t('home.faq_q3'), a: t('home.faq_a3') },
    { q: t('home.faq_q4'), a: t('home.faq_a4') },
    { q: t('home.faq_q5'), a: t('home.faq_a5') },
    { q: t('home.faq_q6'), a: t('home.faq_a6') },
  ];

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative py-12 md:py-20"
    >
      <div className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <div className="text-center mb-10">
          <p className="page-eyebrow justify-center">
            {t('home.faq_eyebrow')}
          </p>
          <h3
            id="faq-title"
            className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight"
          >
            {t('home.faq_title')}
          </h3>
          <p className="mt-3 text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            {t('home.faq_subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group section-frame overflow-hidden [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 md:p-6 font-bold text-base md:text-lg select-none hover:text-primary transition-colors">
                <span className="flex-1">{faq.q}</span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-sm transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-foreground/75 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
