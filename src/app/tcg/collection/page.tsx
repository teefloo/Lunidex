import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { getCollectionSetCatalogCached } from '@/lib/api/server-cache';
import type { TCGCollectionSetSummary } from '@/types/tcg';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { TCGCollectionPage } from './TCGCollectionPage';

async function loadCollectionCatalog(language: string): Promise<TCGCollectionSetSummary[] | undefined> {
  try {
    const sets = await getCollectionSetCatalogCached(language);
    return sets.length > 0 ? sets : undefined;
  } catch {
    // The client page can retry through the same-origin route when the shared
    // catalog is temporarily unavailable during the server render.
    return undefined;
  }
}

export default async function CollectionPage() {
  const [lang, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const initialSets = await loadCollectionCatalog(lang);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), path: '/tcg' },
    { name: t('tcg.collection_title', { defaultValue: 'Collection' }), path: '/tcg/collection' },
  ], lang);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <TCGCollectionPage initialSets={initialSets} initialLanguage={lang} />
    </>
  );
}
