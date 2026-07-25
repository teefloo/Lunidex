'use client';

import { cn } from '@/lib/utils';

const RARITY_TONES: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-400/15' },
  uncommon: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-400/15' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-400/15' },
  promo: { bg: 'bg-pink-500/12', text: 'text-pink-300', border: 'border-pink-400/20' },
  hyperrare: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-400/25' },
  secretrare: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-400/25' },
  specialillustrationrare: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-400/25' },
  ultrarare: { bg: 'bg-violet-500/12', text: 'text-violet-300', border: 'border-violet-400/20' },
  illustrationrare: { bg: 'bg-indigo-500/12', text: 'text-indigo-300', border: 'border-indigo-400/20' },
  doublerare: { bg: 'bg-blue-500/12', text: 'text-blue-300', border: 'border-blue-400/20' },
  rareholo: { bg: 'bg-yellow-500/12', text: 'text-yellow-300', border: 'border-yellow-400/20' },
  rarehologx: { bg: 'bg-red-500/12', text: 'text-red-300', border: 'border-red-400/20' },
  rareholov: { bg: 'bg-red-500/12', text: 'text-red-300', border: 'border-red-400/20' },
  rareholovmax: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-400/25' },
  rareholovstar: { bg: 'bg-amber-500/12', text: 'text-amber-300', border: 'border-amber-400/20' },
  rarerainbow: { bg: 'bg-fuchsia-500/12', text: 'text-fuchsia-300', border: 'border-fuchsia-400/20' },
  raresecret: { bg: 'bg-rose-500/12', text: 'text-rose-300', border: 'border-rose-400/20' },
  amazingrare: { bg: 'bg-cyan-500/12', text: 'text-cyan-300', border: 'border-cyan-400/20' },
  radiantrare: { bg: 'bg-orange-500/12', text: 'text-orange-300', border: 'border-orange-400/20' },
  trainergallery: { bg: 'bg-green-500/12', text: 'text-green-300', border: 'border-green-400/20' },
  reverseholo: { bg: 'bg-gray-500/12', text: 'text-gray-300', border: 'border-gray-400/20' },
};

interface TCGRarityBadgeProps {
  rarity?: string | null;
  className?: string;
}

export function TCGRarityBadge({ rarity, className }: TCGRarityBadgeProps) {
  if (!rarity) return null;

  const key = rarity.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tone = RARITY_TONES[key];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.1em]',
        tone?.bg ?? 'bg-card/40',
        tone?.text ?? 'text-foreground/60',
        tone?.border ?? 'border-border/30',
        className,
      )}
    >
      {rarity}
    </span>
  );
}
