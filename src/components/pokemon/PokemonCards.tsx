'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getPokemonCards } from '@/lib/api/tcg';
import type { TCGCard } from '@/types/tcg';
import { pokemonKeys } from '@/lib/api/keys';
import { ExternalLink, Loader2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCardDetailModal } from '@/components/tcg/TCGCardDetailModal';
import { TCGHolographicCard } from '@/components/tcg/TCGHolographicCard';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import type { TCGCardLanguage } from '@/lib/tcg-language';

interface PokemonCardsProps {
  name: string;
  localizedName?: string;
  lang?: string;
}

// rarity and category are now provided by TCGCard directly from TCGdex detail API

export const PokemonCards: React.FC<PokemonCardsProps> = ({ name, localizedName }) => {
  const { t } = useTranslation();
  const mounted = useMounted();
  const localeHref = useLocaleHref();
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const queryName = localizedName || name;
  // The Pokémon page's `lang` is an interface/translation hint. TCG card data
  // follows the independent workspace preference instead.
  const tcgLang: TCGCardLanguage = mounted ? browseLanguage : 'en';
  
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);

  const { data: cards, isLoading, error, refetch } = useQuery({
    queryKey: [...pokemonKeys.tcg.cards(name), tcgLang, queryName],
    queryFn: () => getPokemonCards(queryName, tcgLang, name),
    enabled: !!queryName,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 48, // Keep in garbage collection for 48 hours
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center min-h-[300px] glass-panel rounded-sm">
        <p className="text-sm font-bold text-foreground/70">
          {t('detail.cards_error', { defaultValue: 'Card data could not be loaded. Please try again.' })}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex min-h-11 items-center rounded-sm border border-primary/30 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px] glass-panel rounded-sm">
        <p className="text-foreground/50 font-bold uppercase tracking-widest text-sm mb-2">
          {t('detail.no_cards_found', { defaultValue: 'No cards found' })}
        </p>
        <p className="text-xs text-foreground/40">
          {t('detail.no_cards_desc', { defaultValue: 'There might not be any cards available for this Pokémon yet.' })}
        </p>
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="glass-panel rounded-sm p-4 sm:p-5 md:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <h3 className="flex items-center gap-3 text-2xl font-black">
          <span className="text-foreground/90">{t('detail.cards')}</span>
          <span className="rounded-md border border-border/50 bg-secondary/50 px-2 py-1 text-xs font-bold text-foreground/60">
            {cards.length}
          </span>
        </h3>
        <Link
          href={`${localeHref(`/tcg?q=${encodeURIComponent(queryName)}`)}&tcgLang=${encodeURIComponent(tcgLang)}`}
          className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('detail.cards_open_catalog', { defaultValue: 'Open in TCG catalog' })}
        </Link>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-x-4 gap-y-7 md:max-lg:pe-14 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] sm:gap-x-5 sm:gap-y-8 xl:grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))]"
      >
        {cards.map((card) => (
          <motion.div key={card.id} variants={itemVariants} className="relative z-10 flex w-full min-w-0 flex-col items-center">
            <TCGHolographicCard
              card={card}
              alt={[card.name, card.set?.name, card.localId].filter(Boolean).join(', ')}
              className="w-full max-w-[250px]"
              onClick={setSelectedCard}
              sizes="(min-width: 1280px) 220px, (min-width: 768px) 20vw, 42vw"
            />
            <div className="mt-1 flex min-h-11 w-full max-w-[250px] min-w-0 items-center gap-1.5">
              {card.set?.id ? (
                <Link
                  href={`${localeHref(`/tcg/sets/${encodeURIComponent(card.set.id)}`)}?tcgLang=${encodeURIComponent(tcgLang)}`}
                  title={card.set.name}
                  className="min-w-0 flex-1 truncate text-center text-xs font-medium leading-5 text-foreground/65 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {card.set.name}
                </Link>
              ) : card.set?.name ? (
                <span className="min-w-0 flex-1 truncate text-center text-xs font-medium leading-5 text-foreground/65" title={card.set.name}>
                  {card.set.name}
                </span>
              ) : null}
              <Link
                href={`${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(tcgLang)}`}
                aria-label={t('tcg.open_card_detail', { name: card.name })}
                title={t('tcg.open_card_detail', { name: card.name })}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-foreground/45 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <TCGCardDetailModal 
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        tcgLanguage={tcgLang}
      />
    </div>
  );
};
