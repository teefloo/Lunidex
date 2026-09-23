const OFFICIAL_ARTWORK_SPECIES_ID_BY_FORM_ID: Readonly<Record<number, number>> = {
  10268: 1008,
  10269: 1008,
  10270: 1008,
  10271: 1008,
};

export function getOfficialArtworkSpeciesId(pokemonId: number): number {
  return OFFICIAL_ARTWORK_SPECIES_ID_BY_FORM_ID[pokemonId] ?? pokemonId;
}

export function getNextPokemonArtworkSource(
  candidates: readonly (string | null | undefined)[],
  failedSources: readonly string[],
): string | undefined {
  const failed = new Set(failedSources);
  return candidates.find((source): source is string => (
    typeof source === 'string' && source.trim().length > 0 && !failed.has(source)
  ));
}

export function shouldOptimizePokemonArtwork(
  source: string,
  animatedSource: string,
  animatedSprites: boolean,
): boolean {
  return !(animatedSprites && source === animatedSource);
}
