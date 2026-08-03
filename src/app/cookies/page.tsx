import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';
import { getLegalDocuments } from '@/lib/i18n/legal';
import type { LegalDocument } from '@/lib/i18n/legal-types';
import { MeasurementNotice } from '@/components/legal/MeasurementNotice';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('legal.cookies.meta_title') || 'Cookie Policy — Lunidex';
  const description = t('legal.cookies.meta_description') || 'Cookie policy for Lunidex.';
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
  const doc: LegalDocument = getLegalDocuments(lang).cookies;

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell py-20">
        <div className="max-w-3xl mx-auto">
          <LegalDocumentView doc={doc} />
          <MeasurementNotice lang={lang} />
          <p className="mt-12 text-xs text-muted-foreground">{t('legal.common.fallback_notice')}</p>
        </div>
      </main>
    </div>
  );
}
