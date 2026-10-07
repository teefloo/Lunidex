import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { HOME_CATALOG_PREVIEW_CARDS, getHomeCatalogPreviewImageSrcSet } from '@/lib/home-catalog-preview';

// This is a labeled illustration of three cards, never personal collection data.
const exampleCards = HOME_CATALOG_PREVIEW_CARDS.filter(({ set }) => set.id === 'sv03.5');

export async function HomeCollectionPreview() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  return (
    <section className="home-catalog-preview home-collection-preview" aria-labelledby="home-collection-preview-title">
      <div className="home-catalog-preview-heading">
        <div>
          <h2 id="home-collection-preview-title">{t('lunidex_home.preview_title')}</h2>
          <p className="home-collection-preview-example">{t('lunidex_home.preview_example')}</p>
        </div>
      </div>
      <ul className="home-catalog-preview-cards">
        {exampleCards.map((card, index) => {
          const owned = index !== 1;
          return (
            <li key={card.id}>
              <div className="home-catalog-preview-card" data-owned={owned}>
                <span className="home-catalog-preview-image">
                  <picture className="absolute inset-0">
                    <source srcSet={getHomeCatalogPreviewImageSrcSet(card.image)} sizes="(max-width: 767px) 28vw, (max-width: 1100px) 14vw, 200px" type="image/webp" />
                    <Image src={card.image} alt={card.name} fill unoptimized loading="eager" className="object-contain" />
                  </picture>
                </span>
                <span className="home-catalog-preview-card-name">{card.name}</span>
                <span className="home-collection-preview-status">
                  {owned ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
                  {t(owned ? 'lunidex_home.preview_owned' : 'lunidex_home.preview_missing')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="home-collection-preview-progress">
        <div><span>{t('lunidex_home.preview_progress')}</span><strong>67%</strong></div>
        <progress value={2} max={3} aria-label={t('lunidex_home.preview_progress')} />
        <p>{t('lunidex_home.preview_count')}</p>
      </div>
      <Link href={localeHref('/tcg/start?source=home_cta', language)} className="home-inline-link">
        {t('lunidex_home.preview_cta')} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
