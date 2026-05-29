'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { useQueries } from '@tanstack/react-query';
import { getPokemonDetail } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import Image from 'next/image';

export default function CompareBar() {
  const compareList = usePrimeDexStore(s => s.compareList);
  const removeFromCompare = usePrimeDexStore(s => s.removeFromCompare);
  const clearCompare = usePrimeDexStore(s => s.clearCompare);
  const { t } = useTranslation();

  const pokemonQueries = useQueries({
    queries: compareList.map(id => ({
      queryKey: ['pokemon-compare-bar', id],
      queryFn: () => getPokemonDetail(id.toString()),
      staleTime: 10 * 60 * 1000,
    }))
  });

  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="glass-toolbar flex items-center justify-between gap-4 rounded-2xl border-primary/20 p-4"
      >
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
          <AnimatePresence mode="popLayout">
            {pokemonQueries.map((q, idx) => {
              const p = q.data;
              const id = compareList[idx];
              
              return (
                <motion.div 
                  key={id}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative group shrink-0"
                >
                  <div className="glass-card flex h-14 w-14 items-center justify-center rounded-xl p-2">
                    {q.isLoading ? (
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : p?.sprites?.front_default ? (
                      <Image 
                        src={p.sprites.front_default} 
                        alt={p.name} 
                        width={40}
                        height={40}
                        sizes="40px"
                        className="w-full h-full object-contain filter drop-shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-background/50 rounded-lg flex items-center justify-center text-foreground/30 text-xs font-bold">
                        {p?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCompare(id)}
                    className="absolute -top-3 -right-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-destructive text-primary-foreground rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg"
                    aria-label={t('card.remove_compare')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {compareList.length < 3 && (
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center text-foreground/20">
              <span className="text-xs font-black">+{3 - compareList.length}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearCompare}
            className="hover:bg-destructive/10 hover:text-destructive rounded-full min-w-[44px] min-h-[44px]"
            aria-label={t('compare.clear')}
            title={t('compare.clear')}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          
          {compareList.length < 2 ? (
            <Button
              className="rounded-xl font-black uppercase tracking-widest gap-2 px-6 shadow-lg shadow-primary/20"
              disabled
              aria-disabled="true"
              title={t('compare.need_two')}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {t('nav.compare')}
            </Button>
          ) : (
            <Link
              href="/compare"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-black uppercase tracking-widest gap-2 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {t('nav.compare')}
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

