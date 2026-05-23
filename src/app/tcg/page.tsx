import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { t } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: t('tcg.page_title'),
  description: t('tcg.page_description'),
  alternates: {
    canonical: '/tcg',
  },
  openGraph: {
    title: t('tcg.page_title'),
    description: t('tcg.page_description'),
    url: `${SITE_URL}/tcg`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: t('tcg.page_title'),
    description: t('tcg.page_description'),
  },
};

export default function TCGPage() {
  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        <TCGResearchDesk initialLatestSet={DEFAULT_LATEST_TCG_SET} />
      </main>
    </div>
  );
}
