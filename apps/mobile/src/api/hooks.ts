import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getPokemonList,
  getPokemonDetail,
  getPokemonSpecies,
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
