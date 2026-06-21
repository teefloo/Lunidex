'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPokemonCards } from '@/lib/api/tcg';
import type { TCGCard } from '@/types/tcg';
import { pokemonKeys } from '@/lib/api/keys';
import { Loader2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { TCGCardDetailModal } from '@/components/tcg/TCGCardDetailModal';
import { TCGHolographicCard } from '@/components/tcg/TCGHolographicCard';

interface PokemonCardsProps {
  name: string;
  localizedName?: string;
  lang?: string;
}

// rarity and category are now provided by TCGCard directly from TCGdex detail API

export const PokemonCards: React.FC<PokemonCardsProps> = ({ name, localizedName, lang }) => {
  const { t } = useTranslation();
  const queryName = localizedName || name;
  const tcgLang = lang || 'en';
  
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);

  const { data: cards, isLoading, error } = useQuery({
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

  if (error || !cards || cards.length === 0) {
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
    <div className="glass-panel p-6 md:p-8 rounded-sm">
      <h3 className="text-2xl font-black mb-8 border-b border-border/60 pb-4 flex items-center gap-3">
        <span className="text-foreground/90">{t('detail.cards')}</span>
        <span className="px-2 py-1 bg-secondary/50 rounded-md text-xs font-bold text-foreground/60 border border-border/50">
          {cards.length}
        </span>
      </h3>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
      >
        {cards.map((card) => (
          <motion.div key={card.id} variants={itemVariants} className="relative z-10 perspective-1000 w-full flex items-center justify-center">
            <TCGHolographicCard
              card={card}
              className="w-[100%] max-w-[280px]"
              onClick={setSelectedCard}
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 28vw, 45vw"
            />
          </motion.div>
        ))}
      </motion.div>

      <TCGCardDetailModal 
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
};
