import type { Metadata } from 'next';

import { getServerTForLanguage } from '@/lib/server-i18n';
import {
  isSupportedLanguage,
  languageToOpenGraphLocale,
  type SupportedLanguage,
} from '@/lib/languages';
import { SITE_URL } from '@/lib/site';
import { OG_SIZE } from '@/lib/og/theme';

import { RedirectToTeam } from './RedirectToTeam';

interface SharePageProps {
  searchParams: Promise<{ code?: string; lang?: string }>;
}

function resolveLang(lang?: string): SupportedLanguage {
  return lang && isSupportedLanguage(lang) ? lang : 'en';
}

// Team ids are encoded as `25-6-9`; keep only digits and dashes.
function sanitizeCode(code?: string): string {
  return (code ?? '').replace(/[^0-9-]/g, '').slice(0, 40);
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const { code, lang } = await searchParams;
  const language = resolveLang(lang);
  const safeCode = sanitizeCode(code);
  const t = getServerTForLanguage(language);
  const title = t('meta.team_title');
  const description = t('meta.team_description');
  const shareUrl = `${SITE_URL}/team/share?code=${encodeURIComponent(safeCode)}&lang=${language}`;
  const ogImage = `${SITE_URL}/api/og/team?code=${encodeURIComponent(safeCode)}&lang=${language}`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: shareUrl },
    openGraph: {
      title,
      description,
      url: shareUrl,
      type: 'website',
      locale: languageToOpenGraphLocale[language],
      images: [{ url: ogImage, width: OG_SIZE.width, height: OG_SIZE.height, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TeamSharePage({ searchParams }: SharePageProps) {
  const { code, lang } = await searchParams;
  const language = resolveLang(lang);
  const safeCode = sanitizeCode(code);
  const t = getServerTForLanguage(language);
  const target = `/team?code=${encodeURIComponent(safeCode)}&lang=${language}`;

  return (
    <div className="app-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-foreground">
      <p className="font-display text-2xl uppercase tracking-widest">{t('team.title')}</p>
      <p className="text-muted-foreground">{t('team.toast_loaded')}</p>
      <RedirectToTeam href={target} />
    </div>
  );
}
