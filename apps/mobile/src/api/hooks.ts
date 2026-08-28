import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getPokemonList,
  getPokemonDetail,
  getPokemonSpecies,
  getAllPokemonNames,
} from '@primedex/core/api/rest';

/** Paginated national-dex listing (20 per page), powered by the shared REST client. */
export function usePokemonList() {
  return useInfiniteQuery({
    queryKey: ['pokemon', 'list'],
    queryFn: ({ pageParam }) => getPokemonList({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextParam,
  });
}

/** Full name index used to search Pokémon that are not in the loaded list pages. */
export function usePokemonSearchIndex(enabled: boolean) {
  return useQuery({
    queryKey: ['pokemon', 'search-index'],
    queryFn: getAllPokemonNames,
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/** Full detail for a Pokémon by name or numeric id (PokeAPI accepts both). */
export function usePokemonDetail(nameOrId: string | number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'detail', String(nameOrId)],
    queryFn: () => getPokemonDetail(String(nameOrId)),
    enabled: nameOrId !== undefined && nameOrId !== null && nameOrId !== '',
  });
}

export function usePokemonSpecies(nameOrId: string | number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'species', String(nameOrId)],
    queryFn: () => getPokemonSpecies(String(nameOrId)),
    enabled: nameOrId !== undefined && nameOrId !== null && nameOrId !== '',
  });
}
