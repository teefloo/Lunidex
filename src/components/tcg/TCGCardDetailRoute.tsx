'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Image from 'next/image';
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
        <article className="mb-8 grid gap-8 rounded-sm border border-border/70 bg-card/50 p-6 md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] md:p-8">
          <div className="flex items-center justify-center rounded-sm border border-border/50 bg-background/50 p-4">
            <Image
              src={card.imageUrl || card.image || '/images/card-placeholder.svg'}
              alt={`${card.name} Pokémon TCG card`}
              width={245}
              height={342}
              sizes="(max-width: 768px) 70vw, 280px"
              priority
              className="h-auto max-h-[420px] w-auto object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              {card.set?.name || t('tcg.unknown')}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {card.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/60">
              {card.description || card.flavorText || t('tcg.detail_empty')}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {card.hp && <div><dt className="text-foreground/40">{t('common.hp', { defaultValue: 'HP' })}</dt><dd className="font-bold">{card.hp}</dd></div>}
              {card.rarity && <div><dt className="text-foreground/40">{t('tcg.rarity')}</dt><dd className="font-bold">{card.rarity}</dd></div>}
              {card.localId && <div><dt className="text-foreground/40">{t('tcg.collector_no')}</dt><dd className="font-bold">#{card.localId}</dd></div>}
            </dl>
          </div>
        </article>
        <TCGCardDetailModal card={card} isOpen onClose={() => router.push(localeHref('/tcg'))} />
      </div>
    </div>
  );
}
