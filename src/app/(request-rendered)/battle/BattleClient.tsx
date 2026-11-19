'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Swords } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

function BattleSimulatorLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <Swords className="h-4 w-4 animate-pulse" /> {t('battle.loading_simulator')}
      </div>
    </div>
  );
}

const BattleSimulator = dynamic(() => import('@/components/battle/BattleSimulator'), {
  ssr: false,
  loading: BattleSimulatorLoading,
});

export default function BattleClient() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t('battle.damage_calculator')}
        </h2>
        <Suspense>
          <BattleSimulator />
        </Suspense>
      </section>
    </div>
  );
}
