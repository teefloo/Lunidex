'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSmogonTier, normalizeNameForPS, type SmogonData } from '@/lib/smogon';

export function useSmogonData(pokemonName: string) {
  const normalized = normalizeNameForPS(pokemonName);

  return useQuery<SmogonData | null>({
    queryKey: ['smogon', normalized],
    queryFn: () => fetchSmogonTier(normalized),
    staleTime: 24 * 60 * 60 * 1000, // 24 h
    retry: 1,
    enabled: !!pokemonName,
  });
}
