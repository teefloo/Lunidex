'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';

export function TCGCollectionStartLink() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => state.tcgOwnedCards.length);
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });
  const href = localeHref(entry.path);

  return (
    <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
      {entry.mode === 'resume' ? t('tcg.activation.resume_cta', { defaultValue: 'Resume my collection' }) : t('tcg.activation.start_cta', { defaultValue: 'Start my collection' })}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
