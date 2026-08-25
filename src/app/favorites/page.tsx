'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { usePrimeDexStore } from '@/store/primedex';
import { useQuery } from '@tanstack/react-query';
import { getAllPokemonNames } from '@/lib/api';
import { PokemonCard } from '@/components/pokemon/PokemonCard';
import { Heart, Home, Ghost } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';

export default function FavoritesPage() {
  const favorites = usePrimeDexStore((state) => state.favorites);
  const { t } = useTranslation();
  const localeHref = useLocaleHref();

  const { data: allNames, isLoading } = useQuery({
    queryKey: ['allPokemonNames'],
    queryFn: getAllPokemonNames,
    staleTime: 30 * 60 * 1000,
  });

  const favoritePokemon = useMemo(() => {
    if (!allNames) return [];
    return allNames.filter(p => {
      const id = parseInt(p.url.split('/').filter(Boolean).pop() || '0');
      return favorites.includes(id);
    });
  }, [allNames, favorites]);

  return (
    <div className="app-page relative overflow-hidden">
      <Header />
      
      <main className="page-shell py-8 relative z-10">
        <PageHeader
          icon={Heart}
          title={t('favorites.title')}
          subtitle={`${t('favorites.subtitle')} ${t('favorites.count', { count: favoritePokemon.length })}`}
          eyebrow={t('favorites.eyebrow', { defaultValue: 'Lunidex' })}
          className="mt-16 md:mt-20"
        />

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-foreground/30 font-black tracking-[0.2em] uppercase text-[11px]">{t('favorites.loading')}</p>
          </div>
        ) : favoritePokemon.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-32 text-foreground/50 glass-panel rounded-sm max-w-2xl mx-auto border-dashed border border-border/50"
          >
            <div className="p-6 bg-card/50 rounded-full mb-6">
              <Ghost className="w-16 h-16 text-foreground/20" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-foreground/70 tracking-tight">{t('favorites.empty_title')}</h3>
            <p className="text-sm text-foreground/40 font-medium mb-8 text-center px-6 max-w-md">
              {t('favorites.empty_desc')}
            </p>
            <Link
              href={localeHref('/pokedex')}
              className="glass-btn px-8 py-4 flex min-h-12 items-center gap-2 hover:scale-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Home className="w-5 h-5" />
              <span className="font-black uppercase tracking-[0.15em] text-sm">{t('favorites.back')}</span>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {favoritePokemon.map((p) => (
              <PokemonCard key={p.name} name={p.name} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
