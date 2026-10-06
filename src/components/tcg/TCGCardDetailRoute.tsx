'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { TCGCardDetailContent } from './TCGCardDetailContent';

export function TCGCardDetailRoute({
  card,
  tcgLanguage = 'en',
}: {
  card: TCGCard | null;
  tcgLanguage?: TCGCardLanguage;
}) {
  const localeHref = useLocaleHref();
  const { t } = useTranslation();
  const returnHref = card?.set?.id
    ? localeHref(`/tcg/sets/${encodeURIComponent(card.set.id)}?tcgLang=${encodeURIComponent(tcgLanguage)}`)
    : localeHref(`/tcg?tcgLang=${encodeURIComponent(tcgLanguage)}`);

  return (
    <div className="app-page">
      <main className="page-shell pb-24 pt-8">
        <Link
          href={returnHref}
          prefetch={false}
          className="glass-control mb-6 inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t('common.back')}
        </Link>
        {card ? (
          <TCGCardDetailContent card={card} tcgLanguage={tcgLanguage} presentation="page" />
        ) : (
          <div className="glass-surface rounded-sm p-8 text-center">
            <h1 className="text-3xl font-black">{t('tcg.no_cards')}</h1>
            <p className="mt-3 text-muted-foreground">{t('tcg.no_cards_desc')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
