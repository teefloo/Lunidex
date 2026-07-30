import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { HomeCollectionPreview } from './HomeCollectionPreview';

export default async function HomeHero() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);

  return (
    <section aria-labelledby="home-title" className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 md:px-8 md:pb-16 md:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Lunidex</p>
          <h1 id="home-title" className="mt-3 font-display text-[clamp(2.75rem,7vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.01em] gradient-text-hero">
            {t('lunidex_home.hero_title', { defaultValue: 'Collect your cards. Play your Pokémon.' })}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {t('lunidex_home.hero_body', { defaultValue: 'Your TCG collection and Pokémon teams, finally together in one simple, personal space.' })}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <HomeCollectionEntry locale={language} startLabel={t('lunidex_home.cta_start')} resumeLabel={t('lunidex_home.cta_resume')} />
            <Link href={localeHref('/pokedex', language)} className="inline-flex min-h-12 items-center justify-center rounded-sm border border-border/70 px-5 text-sm font-bold text-foreground/80 transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {t('lunidex_home.cta_pokedex', { defaultValue: 'Explore the Pokédex' })}
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground/55">{t('lunidex_home.start_without_account', { defaultValue: 'Start without an account.' })}</p>
        </div>
        <HomeCollectionPreview locale={language} copy={{ startLabel: t('lunidex_home.cta_start'), resumeLabel: t('lunidex_home.cta_resume'), previewEyebrow: t('lunidex_home.preview_eyebrow'), previewTitle: t('lunidex_home.preview_title'), previewBody: t('lunidex_home.preview_body'), previewNote: t('lunidex_home.preview_note'), previewOwnedEyebrow: t('lunidex_home.preview_owned_eyebrow'), previewOwnedTitle: t('lunidex_home.preview_owned_title'), previewOwnedCountOne: t('lunidex_home.preview_owned_count_one'), previewOwnedCountOther: t('lunidex_home.preview_owned_count_other'), noAccount: t('lunidex_home.no_account') }} />
      </div>
    </section>
  );
}
