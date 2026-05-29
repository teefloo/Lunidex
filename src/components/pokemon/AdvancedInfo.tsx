'use client';

import React from 'react';
import { PokemonDetail, PokemonSpecies } from '@/types/pokemon';
import { useTranslation } from '@/lib/i18n';
import { 
  Dna, 
  Venus, 
  Mars, 
  Target, 
  Heart 
} from 'lucide-react';

interface AdvancedInfoProps {
  pokemon: PokemonDetail;
  species: PokemonSpecies;
}

export function AdvancedInfo({ pokemon, species }: AdvancedInfoProps) {
  const { t } = useTranslation();

  const genderRate = species.gender_rate;
  const femaleRate = genderRate === -1 ? null : (genderRate / 8) * 100;
  const maleRate = genderRate === -1 ? null : 100 - (femaleRate || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-secondary/20 border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
            <Dna className="w-5 h-5" />
          </div>
          <h4 className="font-black text-sm uppercase tracking-wider">{t('detail.breeding')}</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-2">{t('detail.egg_groups')}</p>
            <div className="flex flex-wrap gap-2">
              {(species?.egg_groups ?? []).map(group => (
                <span key={group.name} className="px-3 py-1 bg-background/50 rounded-lg text-[11px] font-bold text-foreground/70 capitalize border border-border/40">
                  {t(`egg_groups.${group.name}`)}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-2">{t('detail.gender_ratio')}</p>
            {genderRate === -1 ? (
              <p className="text-sm font-black text-foreground/60">{t('detail.genderless')}</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Mars className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-black text-foreground/80">{maleRate}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Venus className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-black text-foreground/80">{femaleRate}%</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-blue-400/20 overflow-hidden flex">
                  <div className="h-full bg-blue-400" style={{ width: `${maleRate}%` }} />
                  <div className="h-full bg-pink-400" style={{ width: `${femaleRate}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-secondary/20 border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
            <Target className="w-5 h-5" />
          </div>
          <h4 className="font-black text-sm uppercase tracking-wider">{t('detail.training')}</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-1">{t('detail.catch_rate')}</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-foreground/90">{species?.capture_rate ?? '—'}</span>
              <div className="flex-1 h-1.5 rounded-full bg-card/50 overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: `${((species?.capture_rate ?? 0) / 255) * 100}%` }} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-1">{t('detail.base_happiness')}</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-foreground/90">{species?.base_happiness ?? '—'}</span>
              <Heart className="w-3.5 h-3.5 text-red-500/50" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-1">{t('detail.base_exp')}</p>
            <p className="text-lg font-black text-foreground/90">{pokemon?.base_experience ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-1">{t('detail.growth_rate')}</p>
            <p className="text-xs font-black text-foreground/70 capitalize">{t(`growth_rates.${species?.growth_rate?.name ?? 'unknown'}`)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

