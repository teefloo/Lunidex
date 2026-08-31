'use client';

import Link from 'next/link';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import LunidexLogo from '@/components/ui/LunidexLogo';

export function HeaderLogo() {
  const caughtPokemon = usePrimeDexStore(s => s.caughtPokemon);
  const mounted = useMounted();
  const resolvedLang = useClientLanguage();
  const caughtCount = mounted ? caughtPokemon.length : 0;
  const progressPercent = Math.round((caughtCount / 1025) * 100);

  return (
    <div className="site-header-brand flex min-w-0 shrink-0 items-center justify-start">
      <Link prefetch={false} href={`/${resolvedLang}`} className="site-header-brand-link group flex min-w-0 items-center gap-2.5">
        <div className="site-header-brand-mark shrink-0">
          <LunidexLogo alt="" priority sizes="28px" className="h-7 w-7 object-contain" />
        </div>
        <div className="site-header-brand-copy flex min-w-0 flex-col items-start gap-1">
          <div className="flex items-baseline leading-none tracking-tight">
            <span translate="no" className="site-header-brand-luni font-display text-[1.05rem] font-extrabold sm:text-base">Luni</span>
            <span translate="no" className="font-display text-[1.05rem] font-medium italic editorial-italic text-foreground sm:text-base">dex</span>
          </div>
          <div className="site-header-progress flex h-3 items-center gap-1.5 px-0.5">
            <span suppressHydrationWarning className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {mounted ? caughtCount.toString().padStart(3, '0') : '000'} <span aria-hidden="true">/</span> 1025
            </span>
            <div className="site-header-progress-track h-[2px] w-8 overflow-hidden bg-foreground/15" role="progressbar" aria-valuenow={mounted ? progressPercent : 0} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${caughtCount} / 1025`} aria-label={mounted ? `${caughtCount} / 1025` : 'Loading progress'}>
              <div className="site-header-progress-fill h-full w-full origin-left bg-primary transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${mounted ? progressPercent / 100 : 0})`, willChange: mounted ? 'transform' : 'auto' }} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
