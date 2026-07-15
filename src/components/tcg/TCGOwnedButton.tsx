'use client';

import { useMemo } from 'react';
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
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const isOwned = mounted && ownedSet.has(cardId);

  const sizeClasses = {
    sm: 'size-11 text-[9px]',
    md: 'size-11 text-[10px]',
    lg: 'size-11 text-xs',
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
        'touch-target inline-flex items-center justify-center rounded-sm border transition-[color,background-color,border-color,box-shadow,transform] duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5',
        sizeClasses[size],
        isOwned
          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-[var(--shadow-pixel-sm)]'
          : 'border-border/40 bg-card/40 text-foreground/30 hover:border-primary/30 hover:text-primary/60',
        className,
      )}
    >
      {isOwned ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
    </button>
  );
}
