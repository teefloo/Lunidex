'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Cpu,
  Disc,
  Egg,
  Gauge,
  GraduationCap,
  HelpCircle,
  Info,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { getMovePokemonLearners } from '@/lib/api/graphql';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TYPE_COLORS, type GraphQLMovePokemonData, type GroupedLearners, type MoveLearnMethod, type MoveListItem, type MovePokemonLearner } from '@/types/pokemon';

interface MoveDetailModalProps {
  move: MoveListItem | null;
  open: boolean;
  onClose: () => void;
}

export default function MoveDetailModal({ move, open, onClose }: MoveDetailModalProps) {
  const { t } = useTranslation();
  const languageId = languageToPokemonLanguageId[useClientLanguage()];

  const {
    data: learnersData,
    isLoading: learnersLoading,
    isError: learnersError,
  } = useQuery<GraphQLMovePokemonData[]>({
    queryKey: ['move-learners', move?.name, languageId],
    queryFn: () => getMovePokemonLearners(move!.name, languageId),
    enabled: Boolean(move && open),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnMount: 'always',
    retry: 2,
  });

  const learners = useMemo(() => buildLearners(learnersData || []), [learnersData]);
  const groupedLearners = useMemo(() => groupLearnersByMethod(learners), [learners]);

  if (!move) return null;

  const typeColor = TYPE_COLORS[move.type] || '#6B7280';
  const totalLearners = learners.length;

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) onClose();
    }}>
      <DialogContent className="glass-surface max-h-[88vh] overflow-y-auto rounded-sm p-0 sm:max-w-4xl">
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: typeColor }}
          />

          <div className="relative px-6 pt-7 pb-5 sm:px-8">
            <div
              className="absolute inset-x-0 top-0 h-32 opacity-70"
              style={{ background: `linear-gradient(180deg, ${typeColor}18, transparent)` }}
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {move.localizedName}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t('moves_page.effect')} {move.description || t('moves_page.no_description')}
                </DialogDescription>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="text-primary-foreground" style={{ backgroundColor: typeColor }}>
                    {t(`types.${move.type}`)}
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-foreground/60">
                    {t(`moves.damage_class.${move.damage_class}`)}
                  </Badge>
                  {move.generation_id !== null && (
                    <Badge variant="ghost" className="text-foreground/45">
                      {t('moves_page.generation')} {move.generation_id}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[26rem]">
                <MoveStatBox icon={Trophy} label={t('moves.power_short')} value={move.power} />
                <MoveStatBox icon={Target} label={t('moves.accuracy_short')} value={move.accuracy !== null ? `${move.accuracy}%` : null} />
                <MoveStatBox icon={Zap} label={t('moves_page.pp')} value={move.pp} />
                <MoveStatBox icon={Gauge} label={t('moves_page.priority')} value={move.priority} />
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-t border-border/70 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-6 px-6 py-6 sm:px-8">
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('moves_page.effect')}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground/70">
                  {move.description || t('moves_page.no_description')}
                </p>
              </section>

              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                      {t('moves_page.learners_title')}
                    </h3>
                  </div>
                  {!learnersLoading && (
                    <Badge variant="outline" className="border-border/70 text-foreground/50">
                      {t('moves_page.learners_count', { count: totalLearners })}
                    </Badge>
                  )}
                </div>

                {learnersLoading ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 rounded-sm" />
                    ))}
                  </div>
                ) : learnersError ? (
                  <div className="mt-4 rounded-sm border border-dashed border-border/70 bg-background/60 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-foreground/60">{t('moves_page.learners_error')}</p>
                  </div>
                ) : learners.length === 0 ? (
                  <div className="mt-4 rounded-sm border border-dashed border-border/70 bg-background/60 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-foreground/45">{t('moves_page.no_learners')}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-5">
                    {groupedLearners.levelUp.length > 0 && (
                      <LearnerSection
                        icon={TrendingUp}
                        title={t('moves_page.learn_methods.level_up')}
                        learners={groupedLearners.levelUp}
                        onClose={onClose}
                        showLevel
                      />
                    )}
                    {groupedLearners.machine.length > 0 && (
                      <LearnerSection
                        icon={Cpu}
                        title={t('moves_page.learn_methods.machine')}
                        learners={groupedLearners.machine}
                        onClose={onClose}
                      />
                    )}
                    {groupedLearners.technicalRecord.length > 0 && (
                      <LearnerSection
                        icon={Disc}
                        title={t('moves_page.learn_methods.technical_record')}
                        learners={groupedLearners.technicalRecord}
                        onClose={onClose}
                      />
                    )}
                    {groupedLearners.egg.length > 0 && (
                      <LearnerSection
                        icon={Egg}
                        title={t('moves_page.learn_methods.egg')}
                        learners={groupedLearners.egg}
                        onClose={onClose}
                      />
                    )}
                    {groupedLearners.tutor.length > 0 && (
                      <LearnerSection
                        icon={GraduationCap}
                        title={t('moves_page.learn_methods.tutor')}
                        learners={groupedLearners.tutor}
                        onClose={onClose}
                      />
                    )}
                    {groupedLearners.other.length > 0 && (
                      <LearnerSection
                        icon={HelpCircle}
                        title={t('moves_page.learn_methods.other')}
                        learners={groupedLearners.other}
                        onClose={onClose}
                      />
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="border-t border-border/70 px-6 py-6 lg:border-l lg:border-t-0 sm:px-8">
              <div className="rounded-sm border border-border/70 bg-card/35 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('moves_page.generation')}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/60">
                  {move.generation_id !== null
                    ? `${t('moves_page.generation')} ${move.generation_id}`
                    : t('moves_page.no_description')}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildLearners(entries: GraphQLMovePokemonData[]): MovePokemonLearner[] {
  const map = new Map<number, MovePokemonLearner>();

  for (const entry of entries) {
    if (!entry.pokemon_v2_pokemon) continue;

    const pokemon = entry.pokemon_v2_pokemon;
    const methodName = entry.pokemon_v2_movelearnmethod?.name as MoveLearnMethod;
    const localizedName = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames?.[0]?.name || pokemon.name;
    const types = pokemon.pokemon_v2_pokemontypes.map((type) => type.pokemon_v2_type.name);

    if (!map.has(pokemon.id)) {
      map.set(pokemon.id, {
        id: pokemon.id,
        name: pokemon.name,
        types,
        localizedName,
        learnMethods: methodName ? [methodName] : [],
        level: entry.level ?? undefined,
      });
      continue;
    }

    const existing = map.get(pokemon.id);
    if (!existing) continue;

    if (methodName && !existing.learnMethods.includes(methodName)) {
      existing.learnMethods.push(methodName);
    }

    if (entry.level !== null && entry.level !== undefined) {
      existing.level = entry.level;
    }
  }

  return Array.from(map.values());
}

function groupLearnersByMethod(learners: MovePokemonLearner[]): GroupedLearners {
  const grouped: GroupedLearners = {
    levelUp: [],
    machine: [],
    technicalRecord: [],
    egg: [],
    tutor: [],
    other: [],
  };

  for (const learner of learners) {
    const hasLevelUp = learner.learnMethods.includes('level-up');
    const hasMachine = learner.learnMethods.includes('machine');
    const hasTechnicalRecord = learner.learnMethods.includes('technical-record');
    const hasTutor = learner.learnMethods.includes('tutor');
    const hasEgg = learner.learnMethods.includes('egg');

    if (hasLevelUp) grouped.levelUp.push(learner);
    if (hasMachine) grouped.machine.push(learner);
    if (hasTechnicalRecord) grouped.technicalRecord.push(learner);
    if (hasEgg) grouped.egg.push(learner);
    if (hasTutor) grouped.tutor.push(learner);
    if (!hasLevelUp && !hasMachine && !hasTechnicalRecord && !hasEgg && !hasTutor) grouped.other.push(learner);
  }

  const sortByName = (a: MovePokemonLearner, b: MovePokemonLearner) => a.localizedName.localeCompare(b.localizedName);

  grouped.levelUp.sort(sortByName);
  grouped.machine.sort(sortByName);
  grouped.technicalRecord.sort(sortByName);
  grouped.egg.sort(sortByName);
  grouped.tutor.sort(sortByName);
  grouped.other.sort(sortByName);

  return grouped;
}

function LearnerSection({
  icon: Icon,
  title,
  learners,
  onClose,
  showLevel = false,
}: {
  icon: LucideIcon;
  title: string;
  learners: MovePokemonLearner[];
  onClose: () => void;
  showLevel?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-black text-foreground/80">{title}</span>
        <Badge variant="outline" className="ml-auto border-border/70 text-foreground/50">
          {learners.length}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {learners.map((pokemon) => (
          <PokemonLearnerCard key={pokemon.id} pokemon={pokemon} onClose={onClose} showLevel={showLevel} />
        ))}
      </div>
    </div>
  );
}

function PokemonLearnerCard({
  pokemon,
  onClose,
  showLevel,
}: {
  pokemon: MovePokemonLearner;
  onClose: () => void;
  showLevel?: boolean;
}) {
  const localeHref = useLocaleHref();
  const [imgSrc, setImgSrc] = useState(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`);
  const fallbackImg = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;

  return (
    <Link href={localeHref(`/pokemon/${pokemon.name}`)} onClick={onClose} className="group">
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="flex flex-col items-center rounded-sm border border-border/70 bg-card/50 p-2 text-center transition-all duration-200 hover:border-border/90 hover:bg-card/65"
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
            onError={() => setImgSrc(fallbackImg)}
          />
        </div>
        <span className="mt-1 w-full truncate text-[11px] font-bold text-foreground/60 group-hover:text-foreground">
          {pokemon.localizedName}
        </span>
        {showLevel && pokemon.level !== undefined && pokemon.level !== null && (
          <span className="mt-0.5 text-[11px] font-bold text-primary/70">
            Lv. {pokemon.level}
          </span>
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
      </motion.div>
    </Link>
  );
}

function MoveStatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-sm border border-border/70 bg-card/50 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">{label}</span>
      <span className="text-lg font-black text-foreground">{value ?? '-'}</span>
    </div>
  );
}
