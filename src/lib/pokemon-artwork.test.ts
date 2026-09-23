import { describe, expect, it } from 'vitest';
import {
  getNextPokemonArtworkSource,
  getOfficialArtworkSpeciesId,
  shouldOptimizePokemonArtwork,
} from './pokemon-artwork';

describe('Pokémon artwork fallback selection', () => {
  it('skips failed and absent sources and selects the next available artwork', () => {
    expect(getNextPokemonArtworkSource(
      ['/form-art.png', null, '/species-art.png'],
      ['/form-art.png'],
    )).toBe('/species-art.png');
  });

  it('returns no source when every candidate has failed', () => {
    expect(getNextPokemonArtworkSource(['/form-art.png'], ['/form-art.png'])).toBeUndefined();
  });

  it('keeps animation GIFs raw while optimizing static artwork', () => {
    const animatedSource = '/other/showdown/25.gif';

    expect(shouldOptimizePokemonArtwork('/official-artwork/25.png', animatedSource, true)).toBe(true);
    expect(shouldOptimizePokemonArtwork(animatedSource, animatedSource, true)).toBe(false);
    expect(shouldOptimizePokemonArtwork(animatedSource, animatedSource, false)).toBe(true);
  });

  it('uses Miraidon species artwork for form IDs without official artwork files', () => {
    for (const formId of [10268, 10269, 10270, 10271]) {
      expect(getOfficialArtworkSpeciesId(formId)).toBe(1008);
    }

    expect(getOfficialArtworkSpeciesId(10272)).toBe(10272);
  });
});
