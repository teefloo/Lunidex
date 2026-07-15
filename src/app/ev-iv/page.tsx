import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';
import Header from '@/components/layout/Header';
import { BarChart3 } from 'lucide-react';
import EVIVPageClient from './EVIVPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('ev_iv.meta_title');
  const description = t('ev_iv.meta_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/ev-iv`,
      languages: buildSubpathLanguages('/ev-iv'),
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default function EVIVPage() {
  return (
    <>
      <Header />
      <main className="min-h-dvh pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Page header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground/90">
              EV / IV Calculator
            </h1>
            <p className="text-sm text-foreground/50 font-medium max-w-md mx-auto">
              Reverse-engineer IVs from your in-game stats, or plan the perfect EV spread at any level.
            </p>
          </div>

          <EVIVPageClient />
        </div>
      </main>
    </>
  );
}
