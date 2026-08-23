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
      className="home-faq-section"
    >
      <div className="home-faq-inner">
        <div className="home-faq-heading">
          <h2
            id="faq-title"
            className="home-faq-title"
          >
            {t('lunidex_home.faq_title')}
          </h2>
          <p className="home-faq-subtitle">
            {t('lunidex_home.faq_subtitle')}
          </p>
        </div>

        <div className="home-faq-list">
          {faqs.map((faq, index) => (
            <details
              key={index}
              id={['faq-account', 'faq-storage', 'faq-track', 'faq-team'][index]}
              className="home-faq-item group [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="home-faq-summary">
                <span className="flex-1">{faq.question}</span>
                <span aria-hidden="true" className="home-faq-toggle">
                  +
                </span>
              </summary>
              <div className="home-faq-answer">
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
