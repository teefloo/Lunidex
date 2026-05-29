'use client';

import { Check, Plus } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';

interface TCGOwnedButtonProps {
  cardId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TCGOwnedButton({ cardId, className, size = 'md' }: TCGOwnedButtonProps) {
  const mounted = useMounted();
  const owned = usePrimeDexStore((s) => s.tcgOwnedCards);
  const toggle = usePrimeDexStore((s) => s.toggleTCGOwned);
  const isOwned = mounted && owned.includes(cardId);

  const sizeClasses = {
    sm: 'h-6 w-6 text-[9px]',
    md: 'h-8 w-8 text-[10px]',
    lg: 'h-10 w-10 text-xs',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle(cardId);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border transition-all',
        sizeClasses[size],
        isOwned
          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
          : 'border-border/40 bg-card/40 text-foreground/30 hover:border-primary/30 hover:text-primary/60',
        className,
      )}
    >
      {isOwned ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
    </button>
  );
}
