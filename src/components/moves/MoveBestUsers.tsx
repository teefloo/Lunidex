'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { TYPE_COLORS } from '@/types/pokemon';
import { useLocaleHref } from '@/hooks/useLocaleHref';

interface PokemonWithStat {
  id: number;
  name: string;
  localizedName: string;
  types: string[];
  statValue: number;
}

interface MoveBestUsersProps {
  users: PokemonWithStat[];
  damageClass: 'physical' | 'special' | 'status';
  labels: {
    title: string;
    subtitle: string;
    attackStat: string;
    spAttackStat: string;
  };
}

export default function MoveBestUsers({ users, damageClass, labels }: MoveBestUsersProps) {
  if (damageClass === 'status' || users.length === 0) return null;

  const statLabel = damageClass === 'physical' ? labels.attackStat : labels.spAttackStat;
  const subtitle = labels.subtitle.replace('{{stat}}', statLabel);

  return (
    <section className="rounded-sm border border-border/70 bg-card/35 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-foreground/30">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {users.slice(0, 6).map((pokemon, index) => (
          <BestUserCard key={pokemon.id} pokemon={pokemon} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function BestUserCard({ pokemon, rank }: { pokemon: PokemonWithStat; rank: number }) {
  const localeHref = useLocaleHref();
  return (
    <Link
      href={localeHref(`/pokemon/${pokemon.name}`)}
      className="group flex flex-col items-center rounded-sm border border-border/70 bg-card/50 p-2 text-center transition-all duration-200 hover:border-border/90 hover:bg-card/65"
    >
      <div className="relative mb-1">
        <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/90 text-[11px] font-black text-primary-foreground">
          {rank}
        </span>
        <div className="relative h-14 w-14">
          <Image
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
            alt={pokemon.localizedName}
            fill
            className="object-contain drop-shadow-lg"
            sizes="56px"
            loading="lazy"
            unoptimized
          />
        </div>
      </div>
      <span className="w-full truncate text-[11px] font-bold text-foreground/60 group-hover:text-foreground">
        {pokemon.localizedName}
      </span>
      <span className="mt-0.5 text-[11px] font-black text-primary/80">{pokemon.statValue}</span>
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
