'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Sparkles, Film } from 'lucide-react';
import { PokemonDetail } from '@/types/pokemon';
import { extractSprites } from '@/lib/pokemon-utils';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getPokemonDisplayName } from '@/lib/form-names';
import { Button } from '@/components/ui/button';

interface SpriteGalleryProps {
  pokemon: PokemonDetail;
}

export function SpriteGallery({ pokemon }: SpriteGalleryProps) {
  const { t } = useTranslation();
  const [showShiny, setShowShiny] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);

  const allSprites = useMemo(() => extractSprites(pokemon), [pokemon]);

  const filteredSprites = useMemo(() => {
    return allSprites.filter((s) => {
      if (showShiny && !showAnimated) return s.isShiny;
      if (showAnimated && !showShiny) return s.isAnimated;
      if (showShiny && showAnimated) return s.isShiny && s.isAnimated;
      return true;
    });
  }, [allSprites, showShiny, showAnimated]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filteredSprites>();
    for (const sprite of filteredSprites) {
      const existing = map.get(sprite.group) || [];
      existing.push(sprite);
      map.set(sprite.group, existing);
    }
    return map;
  }, [filteredSprites]);

  const totalFiltered = filteredSprites.length;
  const totalAll = allSprites.length;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <h3 className="text-xl font-black text-foreground/90 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-sm">
            <Sparkles className="w-5 h-5 text-foreground" />
          </div>
          {t('detail.sprites')} ({totalFiltered}/{totalAll})
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShiny(!showShiny)}
            className={cn(
              'rounded-sm text-[11px] font-black uppercase tracking-wider gap-1.5 transition-all',
              showShiny
                ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                : 'bg-secondary/30 border-border/40 text-foreground/50'
            )}
          >
            <Sparkles className="w-3 h-3" />
            {t('detail.shiny')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnimated(!showAnimated)}
            className={cn(
              'rounded-sm text-[11px] font-black uppercase tracking-wider gap-1.5 transition-all',
              showAnimated
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-secondary/30 border-border/40 text-foreground/50'
            )}
          >
            <Film className="w-3 h-3" />
            {t('detail.animated')}
          </Button>
        </div>
      </div>

      {totalFiltered === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
          <Sparkles className="w-8 h-8 mb-3 opacity-40" />
          <p className="text-sm font-bold uppercase tracking-widest">{t('detail.no_sprites')}</p>
        </div>
      )}

      <div className="space-y-8">
        {Array.from(groups.entries()).map(([group, sprites]) => (
          <div key={group}>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {group}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {sprites.map((sprite, i) => (
                <div
                  key={`${sprite.group}-${sprite.label}-${i}`}
                  className="group relative flex flex-col items-center gap-2 p-3 bg-secondary/20 border border-border/40 rounded-sm hover:bg-secondary/40 hover:border-border/60 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all duration-200"
                >
                  <div className="w-16 h-16 flex items-center justify-center relative">
                    {sprite.url && (
                    <Image
                      src={sprite.url}
                      alt={`${getPokemonDisplayName({
                        name: pokemon.name,
                        baseLocalizedName: pokemon.species.name,
                        baseSpeciesName: pokemon.species.name,
                        lang: 'en',
                      })} ${sprite.label}`}
                      width={96}
                      height={96}
                      className="pixel-sprite w-full h-full object-contain"
                      unoptimized
                    />)}
                  </div>
                  <span className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider text-center leading-tight">
                    {sprite.label}
                  </span>
                  {sprite.isAnimated && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
