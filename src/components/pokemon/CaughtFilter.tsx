'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { PokeballIcon } from '@/components/ui/PokeballIcon';
import { useMounted } from '@/hooks/useMounted';

export default function CaughtFilter() {
  const { showCaughtOnly, setShowCaughtOnly } = usePrimeDexStore();
  const { t } = useTranslation();
  const mounted = useMounted();

  const modes: { id: 'all' | 'caught' | 'uncaught', label: string }[] = [
    { id: 'all', label: mounted ? t('caught_filter.all') : 'All' },
    { id: 'caught', label: mounted ? t('caught_filter.caught') : 'Caught' },
    { id: 'uncaught', label: mounted ? t('caught_filter.missing') : 'Missing' }
  ];

  return (
    <div className="flex bg-card/50 backdrop-blur-xl border border-border/50 rounded-full p-1">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => setShowCaughtOnly(mode.id)}
          aria-label={mode.label}
          className={cn(
            "flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-400 hover:scale-105 active:scale-95",
            showCaughtOnly === mode.id
              ? "bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_rgba(227,53,13,0.4)]"
              : "text-foreground/70 hover:text-foreground/90"
          )}
        >
          {mode.id === 'caught' && <PokeballIcon className="w-3 h-3" />}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
