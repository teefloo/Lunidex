import Link from 'next/link';
import type { Metadata } from 'next';

import NotFoundMiniGame from '@/components/layout/NotFoundMiniGameLazy';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import '@/styles/not-found.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: {
      absolute: `${t('not_found_page.title')} | Lunidex`,
    },
    description: t('not_found_page.description'),
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: null,
    },
  };
}

export default async function NotFound() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  return (
    <div className="page-shell min-h-screen px-4 py-8 text-foreground md:py-12">
      <div className="not-found-layout mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.75fr)] lg:items-stretch">
        <NotFoundMiniGame />

        <section className="section-frame mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-10 text-center md:px-8 md:py-12 lg:justify-center lg:px-10">
          <LunidexLogo alt="" sizes="64px" className="mb-4 h-16 w-16 object-contain" />
          <div className="mb-4 text-7xl font-black text-primary md:text-8xl">
            404
          </div>
          <p className="page-eyebrow justify-center">Lunidex</p>
          <h1 className="mb-4 text-2xl font-black md:text-3xl">
            {t('not_found_page.title')}
          </h1>
          <p className="mb-6 max-w-md leading-relaxed text-foreground/60">
            {t('not_found_page.description')}
          </p>
          <p className="mb-8 max-w-md text-sm leading-6 text-foreground/45">
            {t('not_found_page.hint')}
          </p>

          <nav aria-label={t('not_found_page.quick_navigation')} className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}`} className="glass-btn px-6 py-3 font-bold">
              {t('not_found_page.pokedex_link')}
            </Link>
            <Link href={`/${lang}/team`} className="glass-btn px-6 py-3 font-bold">
              {t('nav.team')}
            </Link>
            <Link href={`/${lang}/quiz`} className="glass-btn px-6 py-3 font-bold">
              {t('quiz.title')}
            </Link>
          </nav>

          <div className="mt-12 space-y-1 text-xs text-foreground/80">
            <p>{t('not_found_page.more_tools')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={`/${lang}/compare`} className="transition-colors hover:text-foreground/50 underline">
                {t('nav.compare')}
              </Link>
              <span>·</span>
              <Link href={`/${lang}/types`} className="transition-colors hover:text-foreground/50 underline">
                {t('nav.types')}
              </Link>
              <span>·</span>
              <Link href={`/${lang}/favorites`} className="transition-colors hover:text-foreground/50 underline">
                {t('nav.favorites')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
