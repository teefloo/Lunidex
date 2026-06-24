import { getServerT } from '@/lib/server-i18n';

export default async function Loading() {
  const t = await getServerT();
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div role="status" aria-live="polite" className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <span className="sr-only">{t('loading.title')}</span>
      </div>
      <p className="page-eyebrow mt-8 justify-center">PrimeDex</p>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.28em] text-foreground/40 animate-pulse">
        {t('loading.title')}
      </h2>
      <p className="mt-2 text-[10px] font-bold text-foreground/20 uppercase tracking-widest">
        {t('loading.subtitle')}
      </p>
    </div>
  );
}
