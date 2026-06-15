import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('tcg.page_title');
  const description = t('tcg.page_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/tcg`,
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/tcg`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function TCGPage() {
  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        <TCGPageTabs />
        <TCGResearchDesk initialLatestSet={DEFAULT_LATEST_TCG_SET} />
      </main>
    </div>
  );
}
