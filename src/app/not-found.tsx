import Link from 'next/link';
import type { Metadata } from 'next';

import NotFoundMiniGame from '@/components/layout/NotFoundMiniGame';
import { getServerT } from '@/lib/server-i18n';
import '@/styles/not-found.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('common.not_found_title', { defaultValue: 'Page Not Found' }) + ' | PrimeDex',
    description: t('common.not_found_desc', {
      defaultValue: "The Pokémon you're looking for might have fled! The page doesn't exist or has been moved.",
    }),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function NotFound() {
  const t = await getServerT();
  return (
    <div className="page-shell min-h-screen px-4 py-8 text-foreground md:py-12">
      <div className="not-found-layout mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.75fr)] lg:items-stretch">
        <NotFoundMiniGame />

        <section className="section-frame mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-10 text-center md:px-8 md:py-12 lg:justify-center lg:px-10">
          <div className="mb-4 text-7xl font-black text-primary md:text-8xl">
            404
          </div>
          <p className="page-eyebrow justify-center">PrimeDex</p>
          <h1 className="mb-4 text-2xl font-black md:text-3xl">
            {t('common.not_found_title', { defaultValue: 'Page Not Found' })}
          </h1>
          <p className="mb-6 max-w-md leading-relaxed text-foreground/60">
            {t('common.not_found_desc', {
              defaultValue: "The Pokémon you're looking for might have fled! The page doesn't exist or has been moved.",
            })}
          </p>
          <p className="mb-8 max-w-md text-sm leading-6 text-foreground/45">
            {t('common.not_found_hint', {
              defaultValue: 'Use the arrows, WASD, or the pad to recover 4-0-4 and open the portal.',
            })}
          </p>

          <nav aria-label="Quick navigation" className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="glass-btn px-6 py-3 font-bold">
              {t('common.browse_pokedex', { defaultValue: 'Browse Pokédex' })}
            </Link>
            <Link href="/team" className="glass-btn px-6 py-3 font-bold">
              {t('nav.team')}
            </Link>
            <Link href="/quiz" className="glass-btn px-6 py-3 font-bold">
              {t('quiz.title')}
            </Link>
          </nav>

          <div className="mt-12 space-y-1 text-xs text-foreground/30">
            <p>{t('common.more_tools', { defaultValue: 'More tools from PrimeDex:' })}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/compare" className="transition-colors hover:text-foreground/50 underline">
                {t('nav.compare')}
              </Link>
              <span>·</span>
              <Link href="/types" className="transition-colors hover:text-foreground/50 underline">
                {t('nav.types')}
              </Link>
              <span>·</span>
              <Link href="/favorites" className="transition-colors hover:text-foreground/50 underline">
                {t('nav.favorites')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
