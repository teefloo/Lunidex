import { getServerT } from '@/lib/server-i18n';

export default async function HomeTrustSection() {
  const t = await getServerT();
  return <section className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="trust-title"><div className="max-w-3xl rounded-sm border border-border/60 bg-card/35 p-6 md:p-8"><h2 id="trust-title" className="text-3xl font-black tracking-tight">{t('auth.signin_title', { defaultValue: 'Sign in to continue' })}</h2><p className="mt-4 text-base leading-7 text-foreground/65">{t('auth.signup_subtitle', { defaultValue: 'Save your collection, team and progress to the cloud.' })}</p><p className="mt-4 text-sm font-semibold text-foreground/55">{t('lunidex_home.independent')}</p></div></section>;
}
