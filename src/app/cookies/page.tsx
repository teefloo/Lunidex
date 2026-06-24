import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';
import { enLegal } from '@/lib/i18n/legal/en';
import { frLegal } from '@/lib/i18n/legal/fr';
import type { LegalDocument } from '@/lib/i18n/legal-types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('legal.cookies.meta_title') || 'Cookie Policy — PrimeDex';
  const description = t('legal.cookies.meta_description') || 'Cookie policy for PrimeDex.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/cookies`,
      languages: buildSubpathLanguages('/cookies'),
    },
    robots: { index: false, follow: true },
  };
}

export default async function CookiePolicyPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const doc: LegalDocument = lang === 'fr' ? frLegal.cookies : enLegal.cookies;

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell py-20">
        <div className="max-w-3xl mx-auto">
          <LegalDocumentView doc={doc} />
          <p className="mt-12 text-xs text-muted-foreground">{t('legal.common.fallback_notice')}</p>
        </div>
      </main>
    </div>
  );
}
