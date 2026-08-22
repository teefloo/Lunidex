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
    <div className="flex shrink-0 items-center justify-start">
      <Link prefetch={false} href={`/${resolvedLang}`} aria-label="Lunidex" className="touch-target flex items-center gap-2.5 group">
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
          <LunidexLogo alt="" priority sizes="24px" className="h-5 w-5 object-contain md:h-6 md:w-6 drop-shadow-[0_0_8px_rgba(1,76,189,0.22)] group-hover:drop-shadow-[0_0_14px_rgba(1,76,189,0.36)]" />
        </div>
        <div className="flex flex-col items-start gap-0.5 max-[479px]:hidden">
          <div className="flex items-baseline leading-none tracking-tight">
            <span className="font-display text-[1.05rem] font-extrabold gradient-text-hero md:text-base">Luni</span>
            <span className="font-display text-[1.05rem] font-medium italic editorial-italic text-foreground md:text-base">dex</span>
          </div>
          <div className="flex h-3 items-center gap-1.5 px-0.5">
            <span suppressHydrationWarning className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-[11px]">
              {mounted ? caughtCount.toString().padStart(3, '0') : '000'} <span className="text-muted-foreground">/</span> 1025
            </span>
            <div className="h-[2px] w-7 overflow-hidden bg-foreground/15" role="progressbar" aria-valuenow={mounted ? progressPercent : 0} aria-valuemin={0} aria-valuemax={100} aria-label={mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}>
              <div className="h-full w-full origin-left bg-primary transition-transform duration-700 ease-out" style={{ transform: `scaleX(${mounted ? progressPercent / 100 : 0})`, willChange: mounted ? 'transform' : 'auto' }} />
            </div>
            <span className="sr-only">{mounted ? `${caughtCount} of 1025 Pokémon caught, ${progressPercent}% complete` : 'Loading progress'}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
