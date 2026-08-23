import { getServerT } from '@/lib/server-i18n';

export default async function HomeCollectionSteps() {
  const t = await getServerT();
  const steps = [
    ['lunidex_home.steps_one_title', 'lunidex_home.steps_one_body'],
    ['lunidex_home.steps_two_title', 'lunidex_home.steps_two_body'],
    ['lunidex_home.steps_three_title', 'lunidex_home.steps_three_body'],
  ] as const;

  return (
    <section id="collection-steps" className="home-collection-steps" aria-labelledby="collection-steps-title">
      <div className="home-collection-steps-inner">
        <div className="home-collection-steps-heading">
          <p className="home-section-kicker">{t('lunidex_home.steps_eyebrow')}</p>
          <h2 id="collection-steps-title">{t('lunidex_home.steps_title')}</h2>
        </div>
        <ul className="home-collection-steps-list">
          {steps.map(([titleKey, bodyKey]) => (
            <li key={titleKey}>
              <h3>{t(titleKey)}</h3>
              <p>{t(bodyKey)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
