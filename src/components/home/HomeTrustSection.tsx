import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';

export default async function HomeTrustSection() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  return <section className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="trust-title"><div className="max-w-3xl rounded-sm border border-border/60 bg-card/35 p-6 md:p-8"><h2 id="trust-title" className="text-3xl font-black tracking-tight">{t('lunidex_home.trust_title', { defaultValue: 'Start without an account.' })}</h2><p className="mt-4 text-base leading-7 text-foreground/65">{t('lunidex_home.trust_body', { defaultValue: 'Your cards are first saved in this browser on this device. You can create an account later to enable synchronization when it is available.' })}</p><p className="mt-4 text-sm font-semibold text-foreground/55">{t('lunidex_home.independent', { defaultValue: 'Lunidex is an independent, unofficial project.' })}</p><Link href={localeHref('/about', language)} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">{t('lunidex_home.about', { defaultValue: 'Learn more about Lunidex' })}</Link></div></section>;
}
