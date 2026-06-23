'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllPokemonSummary } from '@/lib/api/graphql';
import { TYPE_COLORS } from '@/types/pokemon';
import { BADGE_DEFINITIONS, computeBadgeStatus, findNextBadge } from '@/lib/badges';
import type { DashboardData, BadgeConditionData, ActivityAction, ExtensibleMetric, CategoryStats } from '@/types/dashboard';

const GENERATIONS = [
  { id: 1, name: 'Gen 1' },
  { id: 2, name: 'Gen 2' },
  { id: 3, name: 'Gen 3' },
  { id: 4, name: 'Gen 4' },
  { id: 5, name: 'Gen 5' },
  { id: 6, name: 'Gen 6' },
  { id: 7, name: 'Gen 7' },
  { id: 8, name: 'Gen 8' },
  { id: 9, name: 'Gen 9' },
];

function computeCategoryStats(
  sessions: { challenge: string; score: number }[],
  category: string,
): CategoryStats {
  const filtered = sessions.filter((s) => s.challenge === category);
  if (filtered.length === 0) return { totalSessions: 0, averageScore: 0, bestScore: 0 };
  const scores = filtered.map((s) => s.score);
  return {
    totalSessions: filtered.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScore: Math.max(...scores),
  };
}

export function useDashboardData(): {
  data: DashboardData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const {
    caughtPokemon,
    favorites,
    team,
    badges: unlockedBadgeIds,
    quizHighScores,
    quizHistory,
    currentStreak,
    bestStreak,
    totalQuizCorrect,
    visitCount,
    lastVisitDate,
    viewCount,
    history,
    recentActions,
    tcgOwnedCards,
    tcgWishlistCards,
    tcgSavedSearches,
  } = usePrimeDexStore();

  const { data: allPokemon, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'allPokemonSummary'],
    queryFn: getAllPokemonSummary,
    staleTime: 30 * 60 * 1000,
  });

  return useMemo(() => {
    if (!allPokemon) return { data: null, isLoading, isError };

    const totalPokemon = allPokemon.length;
    const caughtSet = new Set(caughtPokemon);
    const viewedIds = new Set([...Object.keys(viewCount).map(Number), ...history.map((h) => h.id)]);

    const caughtCount = caughtPokemon.length;
    const seenCount = viewedIds.size;

    const badgeData: BadgeConditionData = {
      caughtCount,
      favoriteCount: favorites.length,
      teamCount: team.length,
      quizHighScore: quizHighScores.classic,
      quizHighScoreTA: quizHighScores.timeAttack,
      quizHighScoreSilhouette: quizHighScores.silhouette,
      quizHighScoreStats: quizHighScores.stats,
      totalQuizSessions: quizHistory.length,
      uniqueTypesViewed: allPokemon
        .filter((p) => viewedIds.has(p.id))
        .flatMap((p) => p.pokemon_v2_pokemontypes.map((t) => t.pokemon_v2_type.name))
        .filter((t, i, arr) => arr.indexOf(t) === i).length,
      tcgOwnedCount: tcgOwnedCards.length,
      currentStreak,
    };

    const badgeStatuses = computeBadgeStatus(BADGE_DEFINITIONS, badgeData);
    const badgeStatusesWithUnlock = badgeStatuses.map((b) => ({
      ...b,
      unlocked: unlockedBadgeIds.includes(b.id) || b.unlocked,
    }));
    const unlockedBadges = badgeStatusesWithUnlock.filter((b) => b.unlocked);
    const lockedBadges = badgeStatusesWithUnlock.filter((b) => !b.unlocked);
    const nextBadge = findNextBadge(badgeStatusesWithUnlock);

    // Quiz stats
    const quizSessions = quizHistory;
    const allScores = quizSessions.map((s) => s.score);

    const quizStats = {
      totalSessions: quizSessions.length,
      averageScore: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
      bestScore: allScores.length > 0 ? Math.max(...allScores) : Math.max(quizHighScores.classic, quizHighScores.silhouette, quizHighScores.stats),
      worstScore: allScores.length > 0 ? Math.min(...allScores) : 0,
      perCategory: {
        classic: computeCategoryStats(quizSessions, 'classic'),
        silhouette: computeCategoryStats(quizSessions, 'silhouette'),
        stats: computeCategoryStats(quizSessions, 'stats'),
      },
      progression: quizSessions.slice(-20).map((s) => ({
        date: new Date(s.date).toLocaleDateString(),
        score: s.score,
        challenge: s.challenge,
      })),
      currentStreak,
      bestStreak,
      totalCorrect: totalQuizCorrect,
    };

    // Pokedex by generation
    const byGeneration = GENERATIONS.map((gen) => {
      const genPokemon = allPokemon.filter(
        (p) => p.pokemon_v2_pokemonspecy?.generation_id === gen.id,
      );
      return {
        id: gen.id,
        name: gen.name,
        total: genPokemon.length,
        caught: genPokemon.filter((p) => caughtSet.has(p.id)).length,
      };
    });

    // Pokedex by type
    const typeMap = new Map<string, { total: number; caught: number }>();
    allPokemon.forEach((p) => {
      (p.pokemon_v2_pokemontypes || []).forEach((t) => {
        const typeName = t.pokemon_v2_type.name;
        if (!typeMap.has(typeName)) typeMap.set(typeName, { total: 0, caught: 0 });
        const entry = typeMap.get(typeName)!;
        entry.total += 1;
        if (caughtSet.has(p.id)) entry.caught += 1;
      });
    });
    const byType = Array.from(typeMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        caught: stats.caught,
        color: TYPE_COLORS[name] || '#999',
      }))
      .sort((a, b) => b.total - a.total);

    // Most viewed
    const viewCountEntries = Object.entries(viewCount).map(([id, count]) => ({
      id: Number(id),
      count,
    }));
    viewCountEntries.sort((a, b) => b.count - a.count);
    const mostViewed = viewCountEntries.slice(0, 5).map((entry) => {
      const pokemon = allPokemon.find((p) => p.id === entry.id);
      return {
        id: entry.id,
        name: pokemon?.name || `#${entry.id}`,
        count: entry.count,
      };
    });

    // Never viewed
    const neverViewed = allPokemon
      .filter((p) => !viewedIds.has(p.id) && !caughtSet.has(p.id))
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name }));

    // Activity actions
    const actions: ActivityAction[] = recentActions.slice(0, 10);

    // Extensible metrics
    const extensible: ExtensibleMetric[] = [
      {
        id: 'tcg-owned',
        label: 'TCG Cards Owned',
        value: tcgOwnedCards.length,
        icon: 'LayoutGrid',
        subtitle: 'TCG',
      },
      {
        id: 'tcg-wishlist',
        label: 'TCG Wishlist',
        value: tcgWishlistCards.length,
        icon: 'Heart',
        subtitle: 'TCG',
      },
      {
        id: 'saved-searches',
        label: 'Saved Searches',
        value: tcgSavedSearches.length,
        icon: 'Search',
        subtitle: 'TCG',
      },
      {
        id: 'team-size',
        label: 'Team Size',
        value: team.length,
        icon: 'Users',
      },
      {
        id: 'favorites-count',
        label: 'Favorites',
        value: favorites.length,
        icon: 'Heart',
      },
    ];

    return {
      data: {
        profile: {
          displayName: 'Trainer',
          avatarPokemonId: favorites.length > 0 ? favorites[0] : null,
          memberSince: recentActions.length > 0
            ? recentActions[recentActions.length - 1].date
            : null,
        },
        badges: {
          all: badgeStatusesWithUnlock,
          unlocked: unlockedBadges,
          locked: lockedBadges,
          next: nextBadge,
        },
        quiz: {
          ...quizStats,
          worstScore: quizStats.worstScore || 0,
        },
        pokedex: {
          totalPokemon,
          caughtCount,
          seenCount,
          caughtPercent: Math.round((caughtCount / totalPokemon) * 100),
          seenPercent: Math.round((seenCount / totalPokemon) * 100),
          byGeneration,
          byType,
          mostViewed,
          neverViewed,
        },
        activity: {
          visitCount,
          lastVisitDate,
          recentActions: actions,
        },
        extensible,
      },
      isLoading: false,
      isError: false,
    };
  }, [allPokemon, caughtPokemon, favorites, team, quizHighScores, quizHistory, currentStreak, bestStreak, totalQuizCorrect, visitCount, lastVisitDate, viewCount, history, recentActions, tcgOwnedCards, tcgWishlistCards, tcgSavedSearches, unlockedBadgeIds, isLoading, isError]);
}
