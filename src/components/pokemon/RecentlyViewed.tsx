'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Trash2 } from 'lucide-react';
import { formatId } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';

import Image from 'next/image';

export default function RecentlyViewed() {
  const history = usePrimeDexStore(s => s.history);
  const clearHistory = usePrimeDexStore(s => s.clearHistory);
  const mounted = useMounted();
  const { t } = useTranslation();

  if (!mounted || history.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-2 mt-12">
      <div className="flex items-end justify-between mb-4 gap-4">
        <h2 className="font-display text-xl md:text-2xl font-extrabold tracking-[-0.01em] text-foreground">
          {t('recently_viewed.title', { defaultValue: 'Recently viewed' })}
        </h2>
        <Button
          variant="ghost"
          size="touch"
          onClick={clearHistory}
          className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive transition-colors gap-1.5"
          aria-label={t('recently_viewed.clear')}
        >
          <Trash2 className="w-3.5 h-3.5" /> {t('recently_viewed.clear')}
        </Button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {history.map((p, idx) => (
          <Link key={`${p.id}-${idx}`} href={`/pokemon/${p.name}`} className="group block min-w-0">
            <div
              className="codex-frame p-2.5 flex flex-col items-center text-center gap-1.5 w-full min-w-0 hover:border-primary/40 transition-all hover:-translate-y-1 duration-200"
            >
              <div className="relative w-10 h-10">
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                  alt={p.name}
                  width={40}
                  height={40}
                  sizes="40px"
                  className="w-full h-full object-contain relative z-10 drop-shadow-sm"
                  unoptimized
                />
              </div>
              <div className="space-y-0.5 w-full min-w-0">
                <p className="font-mono text-[8px] font-semibold tracking-[0.16em] text-muted-foreground/70 uppercase">
                  {formatId(p.id)}
                </p>
                <p className="text-[10px] font-display font-semibold italic editorial-italic capitalize truncate max-w-full text-foreground/80 group-hover:text-primary transition-colors">
                  {p.name}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
