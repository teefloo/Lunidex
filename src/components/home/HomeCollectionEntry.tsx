'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import type { MouseEventHandler } from 'react';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';

interface HomeCollectionEntryProps {
  locale: string;
  startLabel: string;
  resumeLabel: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function HomeCollectionEntry({ className, locale, startLabel, resumeLabel, onClick }: HomeCollectionEntryProps) {
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => state.tcgOwnedCards.length);
  const { user } = useAuth();
  const { t } = useTranslation();
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });
  const isSignedIn = Boolean(user);
  const href = isSignedIn ? `/${locale}/dashboard` : `/${locale}${entry.path}`;
  const label = isSignedIn
    ? t('lunidex_home.cta_app', { defaultValue: 'Access the app' })
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
