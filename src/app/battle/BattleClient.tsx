'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Swords } from 'lucide-react';

const BattleSimulator = dynamic(() => import('@/components/battle/BattleSimulator'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <Swords className="h-4 w-4 animate-pulse" /> Loading simulator…
      </div>
    </div>
  ),
});

export default function BattleClient() {
  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Damage Calculator
        </h2>
        <Suspense>
          <BattleSimulator />
        </Suspense>
      </section>
    </div>
  );
}
