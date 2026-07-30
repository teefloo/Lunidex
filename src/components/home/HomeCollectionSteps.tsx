import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { HomeCollectionEntry } from './HomeCollectionEntry';

export default async function HomeCollectionSteps() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const steps = [
    ['lunidex_home.steps_one_title', 'lunidex_home.steps_one_body'],
    ['lunidex_home.steps_two_title', 'lunidex_home.steps_two_body'],
    ['lunidex_home.steps_three_title', 'lunidex_home.steps_three_body'],
  ] as const;

  return <section className="border-y border-border/40 bg-card/20 py-12 md:py-16" aria-labelledby="collection-steps-title"><div className="mx-auto w-full max-w-6xl px-5 md:px-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t('lunidex_home.steps_eyebrow')}</p><h2 id="collection-steps-title" className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{t('lunidex_home.steps_title')}</h2><ol className="mt-8 grid gap-5 md:grid-cols-3">{steps.map(([titleKey, bodyKey], index) => <li key={titleKey} className="rounded-sm border border-border/50 bg-background/40 p-5"><p className="text-sm font-black text-primary">0{index + 1}</p><h3 className="mt-4 text-xl font-black">{t(titleKey)}</h3><p className="mt-2 text-sm leading-6 text-foreground/65">{t(bodyKey)}</p></li>)}</ol><HomeCollectionEntry locale={language} startLabel={t('lunidex_home.cta_start')} resumeLabel={t('lunidex_home.cta_resume')} className="mt-8 inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" /></div></section>;
}
