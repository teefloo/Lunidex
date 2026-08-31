'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import type { MouseEventHandler } from 'react';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { countPhysicalTCGCards } from '@/lib/tcg-collections';

interface HomeCollectionEntryProps {
  locale: string;
  startLabel: string;
  resumeLabel: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  initialSignedIn?: boolean;
}

export function HomeCollectionEntry({ className, initialSignedIn, locale, startLabel, resumeLabel, onClick }: HomeCollectionEntryProps) {
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => countPhysicalTCGCards(state.tcgCollectionCards, state.tcgLegacyOwnedCards));
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });
  // During hydration the client session is unknown, so the server-provided
  // first-paint auth state keeps the entry from flashing a wrong CTA.
  const isSignedIn = loading ? (initialSignedIn ?? false) : Boolean(user);
  const href = isSignedIn ? `/${locale}/tcg/collection` : `/${locale}${entry.path}`;
  const label = isSignedIn
    ? t('tcg.collection_title', { defaultValue: t('tcg.nav_collection', { defaultValue: 'Collection' }) })
    : entry.mode === 'resume' ? resumeLabel : startLabel;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className ?? 'inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-sm border border-primary bg-primary px-5 text-sm font-black uppercase tracking-[0.1em] text-primary-foreground transition-[filter,transform] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'}
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
