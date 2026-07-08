import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';
import { getLegalDocuments } from '@/lib/i18n/legal';
import type { LegalDocument } from '@/lib/i18n/legal-types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('legal.terms.meta_title') || 'Terms of Service — PrimeDex';
  const description = t('legal.terms.meta_description') || 'Terms of service for PrimeDex.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/terms`,
      languages: buildSubpathLanguages('/terms'),
    },
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const doc: LegalDocument = getLegalDocuments(lang).terms;

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
