import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { TCGCollectionPage } from './TCGCollectionPage';

export default async function CollectionPage() {
  const [lang, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), path: '/tcg' },
    { name: t('tcg.collection_title', { defaultValue: 'Collection' }), path: '/tcg/collection' },
  ], lang);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <TCGCollectionPage initialLanguage={lang} />
    </>
  );
}
