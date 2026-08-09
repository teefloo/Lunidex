'use client';

import { useState } from 'react';
import { Swords } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TCGComparePanel } from './TCGComparePanel';

export function TCGCompareTrigger() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const tcgCompareList = usePrimeDexStore((state) => state.tcgCompareList);
  const [panelOpen, setPanelOpen] = useState(false);

  if (!mounted || tcgCompareList.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-[305] flex h-12 w-12 items-center justify-center rounded-full',
          'border border-primary/40 bg-primary text-primary-foreground shadow-[var(--shadow-pixel)]',
          'transition-all hover:scale-105 hover:shadow-[var(--shadow-pixel-lg)] active:scale-95',
        )}
        aria-label={t('tcg.compare_open')}
        title={t('tcg.compare_open')}
      >
        <Swords className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black leading-none text-white">
          {tcgCompareList.length}
        </span>
      </button>

      <TCGComparePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
