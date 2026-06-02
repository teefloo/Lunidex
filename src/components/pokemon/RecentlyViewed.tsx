'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatId } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { Skeleton } from '@/components/ui/skeleton';

import Image from 'next/image';

export default function RecentlyViewed() {
  const { history, clearHistory } = usePrimeDexStore();
  const mounted = useMounted();
  const { t } = useTranslation();

  if (!mounted || history.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-2 mt-12" aria-hidden="true">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div className="flex flex-col gap-2">
            <p className="page-eyebrow flex items-center gap-3 text-muted-foreground/90">
              <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
              <span>Appendix · Field Notes</span>
            </p>
            <h2 className="page-title font-display text-2xl md:text-3xl font-extrabold tracking-[-0.01em] text-foreground" style={{ fontVariationSettings: '"opsz" 60' }}>
              Recently catalogued
            </h2>
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="rule-line mb-6" aria-hidden="true" />
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="codex-frame p-2.5 flex flex-col items-center text-center gap-1.5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 w-full">
                <Skeleton className="h-2 w-6 rounded-full mx-auto" />
                <Skeleton className="h-2.5 w-12 rounded-full mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-2 mt-12">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div className="flex flex-col gap-2">
          <p className="page-eyebrow flex items-center gap-3 text-muted-foreground/90">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
            <span>Appendix · Field Notes</span>
          </p>
          <h2 className="page-title font-display text-2xl md:text-3xl font-extrabold tracking-[-0.01em] text-foreground" style={{ fontVariationSettings: '"opsz" 60' }}>
            Recently catalogued
          </h2>
          <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-[0.22em]">
            {t('recently_viewed.subtitle', { count: history.length })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="h-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive transition-colors gap-1.5"
          aria-label={t('recently_viewed.clear')}
        >
          <Trash2 className="w-3.5 h-3.5" /> {t('recently_viewed.clear')}
        </Button>
      </div>
      <div className="rule-line mb-6" aria-hidden="true" />
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {history.map((p, idx) => (
          <Link key={`${p.id}-${idx}`} href={`/pokemon/${p.name}`}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="codex-frame p-2.5 flex flex-col items-center text-center gap-1.5 hover:border-primary/40 transition-all"
            >
              <div className="relative w-10 h-10">
                <div className="absolute inset-x-1 bottom-0 h-2 rounded-full bg-foreground/10 transition-opacity group-hover:opacity-80" />
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                  alt={p.name}
                  width={40}
                  height={40}
                  sizes="40px"
                  className="w-full h-full object-contain relative z-10 drop-shadow-sm"
                />
              </div>
              <div className="space-y-0.5 w-full">
                <p className="font-mono text-[8px] font-semibold tracking-[0.16em] text-muted-foreground/70 uppercase">
                  {formatId(p.id)}
                </p>
                <p className="text-[10px] font-display font-semibold italic editorial-italic capitalize truncate max-w-full text-foreground/80 group-hover:text-primary transition-colors">
                  {p.name}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}
