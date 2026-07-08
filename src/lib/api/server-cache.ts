import { cache } from 'react';
import { getPokemonDetail, getPokemonSpecies } from './rest';
import { getLocalizedPokemonData } from './graphql';

/**
 * Per-request memoized versions of the PokéAPI fetchers used by both
 * `generateMetadata`/`generateStaticParams` and the page/layout render on
 * the pokemon detail route. `layout.tsx`, `page.tsx`'s `generateMetadata`,
 * and `page.tsx` itself each independently call these with the same
 * arguments during a single request — `cache()` dedupes them.
 */
export const getPokemonDetailCached = cache(getPokemonDetail);
export const getPokemonSpeciesCached = cache(getPokemonSpecies);
export const getLocalizedPokemonDataCached = cache(getLocalizedPokemonData);
