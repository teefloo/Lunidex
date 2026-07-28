'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import { TCGCardDetailModal } from './TCGCardDetailModal';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';

export function TCGCardDetailRoute({ card }: { card: TCGCard | null }) {
  const router = useRouter();
  const localeHref = useLocaleHref();
  const { t } = useTranslation();

  if (!card) {
    return (
      <div className="page-shell py-24">
        <div className="glass-surface mx-auto max-w-2xl rounded-[2rem] px-8 py-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.22em]">{t('tcg.no_cards')}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-foreground/45">
            {t('tcg.no_cards_desc')}
          </p>
          <button
            type="button"
            onClick={() => router.push(localeHref('/tcg'))}
            className="glass-control mt-8 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('tcg.back_to_catalog')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(227,53,13,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(12,194,181,0.12),transparent_34%)]" />
      <div className="page-shell py-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="glass-control mb-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <TCGCardDetailModal card={card} isOpen onClose={() => router.push(localeHref('/tcg'))} />
      </div>
    </div>
  );
}
