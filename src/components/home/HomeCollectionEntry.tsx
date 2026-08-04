'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';

interface HomeCollectionEntryProps {
  locale: string;
  startLabel: string;
  resumeLabel: string;
  className?: string;
}

export function HomeCollectionEntry({ className, locale, startLabel, resumeLabel }: HomeCollectionEntryProps) {
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => state.tcgOwnedCards.length);
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });

  return (
    <Link
      href={`/${locale}${entry.path}`}
      className={className ?? 'inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-sm border border-primary bg-primary px-5 text-sm font-black uppercase tracking-[0.1em] text-primary-foreground transition-[filter,transform] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'}
    >
      {entry.mode === 'resume' ? resumeLabel : startLabel}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
