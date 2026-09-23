import { getBaseSpeciesName } from './form-names';

export function getCurrentEvolutionSpeciesName(
  speciesName: string | null | undefined,
  pokemonName: string,
): string {
  return speciesName?.trim() || getBaseSpeciesName(pokemonName);
}
