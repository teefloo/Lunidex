'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Cpu, Disc, Egg, GraduationCap, TrendingUp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TYPE_COLORS } from '@/types/pokemon';
import { useLocaleHref } from '@/hooks/useLocaleHref';

export interface LearnerEntry {
  id: number;
  name: string;
  localizedName: string;
  types: string[];
  learnMethod: string;
  level?: number | null;
}

type LearnMethodFilter = 'all' | 'level-up' | 'machine' | 'technical-record' | 'egg' | 'tutor';

interface MoveLearnerGridProps {
  learners: LearnerEntry[];
  moveName: string;
  labels: {
    title: string;
    byLevel: string;
    byTm: string;
    byEgg: string;
    byTutor: string;
    showAll: string;
    noLearners: string;
  };
}

export default function MoveLearnerGrid({ learners, moveName, labels }: MoveLearnerGridProps) {
  const [filter, setFilter] = useState<LearnMethodFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const DISPLAY_LIMIT = 50;

  // Deduplicate by pokemon id, keeping most significant method
  const dedupedMap = new Map<number, LearnerEntry>();
  for (const l of learners) {
    const existing = dedupedMap.get(l.id);
    if (!existing) {
      dedupedMap.set(l.id, l);
    }
  }

  // Build method groups from all learners (before dedup for filter chips)
  const methodSet = new Set(learners.map((l) => l.learnMethod));
  const availableMethods = Array.from(methodSet);

  // Filter unique pokemon by selected method
  const allByMethod = filter === 'all'
    ? Array.from(dedupedMap.values())
    : learners.filter((l) => l.learnMethod === filter).reduce<LearnerEntry[]>((acc, l) => {
        if (!acc.find((x) => x.id === l.id)) acc.push(l);
        return acc;
      }, []);

  const displayed = showAll ? allByMethod : allByMethod.slice(0, DISPLAY_LIMIT);
  const remaining = allByMethod.length - DISPLAY_LIMIT;

  const filterOptions: { key: LearnMethodFilter; label: string; icon: LucideIcon }[] = [
    { key: 'all', label: 'All', icon: Users },
    ...(availableMethods.includes('level-up') ? [{ key: 'level-up' as LearnMethodFilter, label: labels.byLevel, icon: TrendingUp }] : []),
    ...(availableMethods.includes('machine') ? [{ key: 'machine' as LearnMethodFilter, label: labels.byTm, icon: Cpu }] : []),
    ...(availableMethods.includes('technical-record') ? [{ key: 'technical-record' as LearnMethodFilter, label: 'TR', icon: Disc }] : []),
    ...(availableMethods.includes('egg') ? [{ key: 'egg' as LearnMethodFilter, label: labels.byEgg, icon: Egg }] : []),
    ...(availableMethods.includes('tutor') ? [{ key: 'tutor' as LearnMethodFilter, label: labels.byTutor, icon: GraduationCap }] : []),
  ];

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            {labels.title.replace('{{moveName}}', moveName)}
          </h3>
        </div>
        <Badge variant="outline" className="shrink-0 border-border/70 text-foreground/50">
          {allByMethod.length}
        </Badge>
      </div>

      {/* Method filter tabs */}
      {filterOptions.length > 2 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filterOptions.map(({ key, label, icon: Icon }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setShowAll(false);
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                  active
                    ? 'border-primary/35 bg-primary/15 text-primary'
                    : 'border-border/60 bg-card/50 text-foreground/55 hover:border-border/90 hover:bg-card/65 hover:text-foreground'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {allByMethod.length === 0 ? (
        <p className="text-center text-sm text-foreground/45">{labels.noLearners}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {displayed.map((pokemon) => (
              <PokemonLearnerCard key={`${pokemon.id}-${pokemon.learnMethod}`} pokemon={pokemon} />
            ))}
          </div>

          {!showAll && remaining > 0 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(true)}
                className="h-9 px-4 text-[10px] uppercase tracking-[0.18em]"
              >
                {labels.showAll.replace('{{count}}', String(allByMethod.length))}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PokemonLearnerCard({ pokemon }: { pokemon: LearnerEntry }) {
  const localeHref = useLocaleHref();
  const [imgSrc, setImgSrc] = useState(
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
  );

  return (
    <Link
      href={localeHref(`/pokemon/${pokemon.name}`)}
      className="group flex flex-col items-center rounded-sm border border-border/70 bg-card/50 p-2 text-center transition-all duration-200 hover:border-border/90 hover:bg-card/65"
    >
      <div className="relative h-14 w-14">
        <Image
          src={imgSrc}
          alt={pokemon.localizedName}
          fill
          className="object-contain drop-shadow-lg"
          sizes="56px"
          loading="lazy"
          unoptimized
          onError={() =>
            setImgSrc(
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
            )
          }
        />
      </div>
      <span className="mt-1 w-full truncate text-[10px] font-bold text-foreground/60 group-hover:text-foreground">
        {pokemon.localizedName}
      </span>
      {pokemon.learnMethod === 'level-up' && pokemon.level != null && pokemon.level > 0 && (
        <span className="mt-0.5 text-[9px] font-bold text-primary/70">Lv. {pokemon.level}</span>
      )}
      <div className="mt-1 flex gap-1">
        {pokemon.types.map((type) => (
          <span
            key={type}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[type] || '#6B7280' }}
          />
        ))}
      </div>
    </Link>
  );
}
