import Header from '@/components/layout/Header';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { enLegal } from '@/lib/i18n/legal/en';
import { frLegal } from '@/lib/i18n/legal/fr';
import type { LegalDocument } from '@/lib/i18n/legal-types';

export default async function PrivacyPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const doc: LegalDocument = lang === 'fr' ? frLegal.privacy : enLegal.privacy;

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
