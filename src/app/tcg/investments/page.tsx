import type { Metadata } from 'next';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { TCGInvestmentsPage } from '@/components/tcg/TCGInvestmentsPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const language = await getServerLanguage();
  const title = t('investments.title'), description = t('investments.subtitle');
  return {
    title, description, robots: { index: false, follow: true },
    alternates: { canonical: `/${language}/tcg/investments`, languages: buildSubpathLanguages('/tcg/investments') },
    openGraph: { title, description, url: `/${language}/tcg/investments`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
  };
}

export default function InvestmentsPage() { return <TCGInvestmentsPage />; }
