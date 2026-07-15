import { describe, expect, it } from 'vitest';
import { parseHomeFilters, serializeHomeFilters } from './pokemon-filter-url';

describe('home filter URL state', () => {
  it('parses valid values and ignores unknown values', () => {
    const parsed = parseHomeFilters(new URLSearchParams(
      'q=charizard&types=fire,water,unknown,fire&gen=9&sort=name-desc&view=missing&fav=1&bad=value',
    ));

    expect(parsed).toEqual({
      q: 'charizard',
      types: ['fire', 'water'],
      gen: 9,
      sort: 'name-desc',
      view: 'missing',
      fav: true,
    });
  });

  it('serializes the public interface without default noise', () => {
    expect(serializeHomeFilters({
      searchTerm: '  pikachu ',
      selectedTypes: ['electric'],
      selectedGeneration: 1,
      sortBy: 'id-asc',
      showCaughtOnly: 'caught',
      showFavoritesOnly: true,
    })).toBe('q=pikachu&types=electric&gen=1&view=caught&fav=1');
  });
});
