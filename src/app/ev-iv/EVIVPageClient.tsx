'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
    </div>
  );
}

const EVIVCalculator = dynamic(
  () => import('@/components/ev-iv/EVIVCalculator'),
  { ssr: false, loading: () => <Loader /> }
);
const EVPlanner = dynamic(
  () => import('@/components/ev-iv/EVPlanner'),
  { ssr: false, loading: () => <Loader /> }
);

const TABS = [
  { id: 'iv'  as const, labelKey: 'ev_iv.tab_iv'  },
  { id: 'ev'  as const, labelKey: 'ev_iv.tab_ev'  },
];

export default function EVIVPageClient() {
  const { t } = useTranslation();
  const [active, setActive] = useState<'iv' | 'ev'>('iv');

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-secondary/30 rounded-sm border border-border/40 max-w-xs mx-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-[2px] transition-all duration-200',
              active === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/50 hover:text-foreground hover:bg-card/50',
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="bg-card/40 border border-border/40 rounded-sm p-5 md:p-6">
        {active === 'iv' ? <EVIVCalculator /> : <EVPlanner />}
      </div>
    </div>
  );
}
