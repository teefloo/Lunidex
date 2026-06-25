'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { PokeballIcon } from '@/components/ui/PokeballIcon';
import { useMounted } from '@/hooks/useMounted';

export default function CaughtFilter() {
  const showCaughtOnly = usePrimeDexStore(s => s.showCaughtOnly);
  const setShowCaughtOnly = usePrimeDexStore(s => s.setShowCaughtOnly);
  const { t } = useTranslation();
  const mounted = useMounted();

  const modes: { id: 'all' | 'caught' | 'uncaught', label: string }[] = [
    { id: 'all', label: mounted ? t('caught_filter.all') : 'All' },
    { id: 'caught', label: mounted ? t('caught_filter.caught') : 'Caught' },
    { id: 'uncaught', label: mounted ? t('caught_filter.missing') : 'Missing' }
  ];

  return (
    <div className="flex bg-card/80 border border-border/60 rounded-sm p-0.5 shadow-[var(--shadow-pixel-sm)]">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => setShowCaughtOnly(mode.id)}
          aria-label={mode.label}
          className={cn(
            "flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-sm text-[10px] font-black uppercase tracking-wider transition-all duration-100",
            showCaughtOnly === mode.id
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-pixel-sm)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {mode.id === 'caught' && <PokeballIcon className="w-3 h-3" />}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
