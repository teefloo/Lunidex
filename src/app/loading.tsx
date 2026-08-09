import { getServerT } from '@/lib/server-i18n';

export default async function Loading() {
  const t = await getServerT();
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center bg-background">
      <div role="status" aria-live="polite" className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="sr-only">{t('loading.title')}</span>
      </div>
      <p className="page-eyebrow mt-8 justify-center">Lunidex</p>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.28em] text-foreground/75 animate-pulse">
        {t('loading.title')}
      </h2>
      <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
        {t('loading.subtitle')}
      </p>
    </div>
  );
}
