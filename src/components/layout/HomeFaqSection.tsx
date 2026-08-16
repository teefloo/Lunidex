import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { getLunidexHomeFaqs } from '@/lib/lunidex-home-content';
import { HomeFaqAnchorBehavior } from './HomeFaqAnchorBehavior';

export default async function HomeFaqSection() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const faqs = getLunidexHomeFaqs(t, language);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="home-faq-section relative py-12 md:py-20"
    >
      <div className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <div className="text-center mb-10">
          <p className="page-eyebrow justify-center">
            {t('lunidex_home.faq_eyebrow')}
          </p>
          <h2
            id="faq-title"
            className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight"
          >
            {t('lunidex_home.faq_title')}
          </h2>
          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('lunidex_home.faq_subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={index}
              id={['faq-account', 'faq-storage', 'faq-track', 'faq-team'][index]}
              className="group section-frame overflow-hidden [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 md:p-6 font-bold text-base md:text-lg select-none hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <span className="flex-1">{faq.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-sm transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-muted-foreground leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
      <HomeFaqAnchorBehavior />
    </section>
  );
}
