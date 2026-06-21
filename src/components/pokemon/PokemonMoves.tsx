'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { Trophy, Target, Info } from 'lucide-react';
import { motion } from 'framer-motion';

import { getPokemonMovesLocalized } from '@/lib/api/graphql';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TYPE_COLORS, GraphQLPokemonMoveData } from '@/types/pokemon';
import { Skeleton } from '@/components/ui/skeleton';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';

interface PokemonMovesProps {
  pokemonName: string;
}

const LANGUAGE_MAP: Record<string, number> = {
  en: 9,
  fr: 5,
  es: 7,
  de: 6,
  it: 8,
  ja: 11,
  ko: 3,
};

export const PokemonMoves = ({ pokemonName }: PokemonMovesProps) => {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { language, systemLanguage } = usePrimeDexStore();
  const resolvedLang = mounted ? (language === 'auto' ? systemLanguage : language) : 'en';

  const languageId = LANGUAGE_MAP[resolvedLang] || 9;

  const { data: moves, isLoading, error } = useQuery({
    queryKey: ['pokemon-moves-local', pokemonName, languageId],
    queryFn: () => getPokemonMovesLocalized(pokemonName, languageId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (error || !moves || moves.length === 0) {
    return (
      <Card className="bg-card/50 border-border/60">
        <CardContent className="p-6 text-center text-foreground/50">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('pokemon.errors.noMoves') || 'No moves found'}</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMoves = [...moves].sort((a, b) => {
    const nameA = a.pokemon_v2_move.pokemon_v2_movenames?.[0]?.name || a.pokemon_v2_move.name;
    const nameB = b.pokemon_v2_move.pokemon_v2_movenames?.[0]?.name || b.pokemon_v2_move.name;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedMoves.map((moveData: GraphQLPokemonMoveData) => {
        const move = moveData.pokemon_v2_move;
        const moveNameInternal = move.name;
        const localizedName = move.pokemon_v2_movenames?.[0]?.name || moveNameInternal;
        const typeInternal = move.pokemon_v2_type?.name || 'normal';
        const damageClass = move.pokemon_v2_movedamageclass?.name || 'status';
        const power = move.power;
        const accuracy = move.accuracy;
        const description = move.pokemon_v2_moveflavortexts?.[0]?.flavor_text?.replace(/\n/g, ' ') || t('pokemon.moves.noDescription');

        const typeColor = TYPE_COLORS[typeInternal as keyof typeof TYPE_COLORS] || '#6B7280';

        return (
          <motion.div
            key={moveNameInternal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full bg-muted/40 border-border/60  overflow-hidden hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground capitalize">{localizedName}</CardTitle>
                  <CardDescription className="text-foreground/60 capitalize mt-1">
                    {t(`moves.damage_class.${damageClass}`) || damageClass}
                  </CardDescription>
                </div>
                <Badge className="text-primary-foreground whitespace-nowrap px-2 py-1" style={{ backgroundColor: typeColor }}>
                  {t(`types.${typeInternal}`)}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-4 text-sm text-foreground/70">
                  {power !== null ? (
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                      <Trophy className="w-4 h-4 text-orange-400" />
                      <span className="font-semibold text-foreground">{power}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md opacity-50">
                      <Trophy className="w-4 h-4" />
                      <span>-</span>
                    </div>
                  )}

                  {accuracy !== null ? (
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="font-semibold text-foreground">{accuracy}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md opacity-50">
                      <Target className="w-4 h-4" />
                      <span>-</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-foreground/80 line-clamp-3" title={description}>
                  {description}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
