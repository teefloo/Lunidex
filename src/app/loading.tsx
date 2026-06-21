import { PokeballLoader } from '@/components/ui/PokeballLoader';
import { getServerT } from '@/lib/server-i18n';

export default async function Loading() {
  const t = await getServerT();
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 ">
      <div role="status" aria-live="polite" className="relative">
        <div className="absolute inset-x-2 bottom-0 h-8 rounded-sm bg-primary/10 animate-pulse" />
        <PokeballLoader className="w-16 h-16 relative z-10" />
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
