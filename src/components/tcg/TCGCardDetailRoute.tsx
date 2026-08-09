'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getTCGCardImageCandidates } from '@/lib/tcg-images';
import { TCGImageWithFallback } from './TCGImageWithFallback';

const TCGCardDetailModal = dynamic(
  () => import('./TCGCardDetailModal').then((module) => module.TCGCardDetailModal),
  { ssr: false },
);

export function TCGCardDetailRoute({ card }: { card: TCGCard | null }) {
  const router = useRouter();
  const localeHref = useLocaleHref();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageCandidates = card ? getTCGCardImageCandidates(card, 'high') : [];

  if (!card) {
    return (
      <div className="page-shell py-24">
        <div className="glass-surface mx-auto max-w-2xl rounded-[2rem] px-8 py-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.22em]">{t('tcg.no_cards')}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
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
            <TCGImageWithFallback
              candidates={imageCandidates}
              alt={`${card.name} Pokémon TCG card`}
              width={245}
              height={342}
              sizes="(max-width: 768px) 70vw, 280px"
              priority
              loading="eager"
              fetchPriority="high"
              className="h-auto max-h-[420px] w-auto object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground">
              {card.set?.name || t('tcg.unknown')}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {card.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {card.description || card.flavorText || t('tcg.detail_empty')}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {card.hp && <div><dt className="text-muted-foreground">{t('common.hp', { defaultValue: 'HP' })}</dt><dd className="font-bold">{card.hp}</dd></div>}
              {card.rarity && <div><dt className="text-muted-foreground">{t('tcg.rarity')}</dt><dd className="font-bold">{card.rarity}</dd></div>}
              {card.localId && <div><dt className="text-muted-foreground">{t('tcg.collector_no')}</dt><dd className="font-bold">#{card.localId}</dd></div>}
              {card.category && <div><dt className="text-muted-foreground">{t('tcg.card_category')}</dt><dd className="font-bold">{card.category}</dd></div>}
              {card.illustrator && <div><dt className="text-muted-foreground">{t('tcg.illustrator')}</dt><dd className="font-bold">{card.illustrator}</dd></div>}
              {card.types && card.types.length > 0 && <div><dt className="text-muted-foreground">{t('tcg.pokemon_types')}</dt><dd className="font-bold">{card.types.join(', ')}</dd></div>}
            </dl>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/35 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/60 hover:bg-primary/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('tcg.open_card_detail', { name: card.name })}
            </button>
          </div>
        </article>

        <div className="grid gap-8 lg:grid-cols-2">
          {getAbilities(card).length > 0 && (
            <section className="glass-surface rounded-sm p-6 sm:p-8">
              <h2 className="text-lg font-black uppercase tracking-[0.14em] text-foreground">{t('tcg.abilities')}</h2>
              <div className="mt-5 space-y-4">
                {getAbilities(card).map((ability, index) => (
                  <article key={`${ability.name || 'ability'}-${index}`} className="rounded-sm border border-border/45 bg-card/40 p-4">
                    <h3 className="font-bold text-foreground">{ability.name || t('tcg.unknown')}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{ability.effect || ability.text || t('tcg.none')}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {card.attacks && card.attacks.length > 0 && (
            <section className="glass-surface rounded-sm p-6 sm:p-8">
              <h2 className="text-lg font-black uppercase tracking-[0.14em] text-foreground">{t('detail.moveset')}</h2>
              <div className="mt-5 space-y-4">
                {card.attacks.map((attack, index) => (
                  <article key={`${attack.name || 'attack'}-${index}`} className="rounded-sm border border-border/45 bg-card/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-foreground">{attack.name || t('tcg.unknown')}</h3>
                      {attack.damage && <span className="font-black text-foreground">{attack.damage}</span>}
                    </div>
                    {attack.cost && attack.cost.length > 0 && <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{attack.cost.join(' · ')}</p>}
                    {(attack.effect || attack.text) && <p className="mt-2 text-sm leading-7 text-muted-foreground">{attack.effect || attack.text}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {isModalOpen && (
          <TCGCardDetailModal
            card={card}
            isOpen
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function getAbilities(card: TCGCard) {
  if (!card.abilities) return [];
  return Array.isArray(card.abilities) ? card.abilities : [card.abilities];
}
