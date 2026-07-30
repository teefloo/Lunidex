'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';

interface HomeCollectionEntryProps {
  className?: string;
}

export function HomeCollectionEntry({ className }: HomeCollectionEntryProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => state.tcgOwnedCards.length);
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });

  return (
    <Link
      href={localeHref(entry.path)}
      className={className ?? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'}
    >
      {entry.mode === 'resume'
        ? t('lunidex_home.cta_resume', { defaultValue: 'Resume my collection' })
        : t('lunidex_home.cta_start', { defaultValue: 'Start my collection' })}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
