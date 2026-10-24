import { describe, expect, it } from 'vitest';
import { getTCGAlbumCardPrimaryAction } from './tcg-album-card-actions';

describe('getTCGAlbumCardPrimaryAction', () => {
  it('adds a missing card when its image is clicked', () => {
    expect(getTCGAlbumCardPrimaryAction(false)).toBe('add');
  });

  it('opens details for an owned card when its image is clicked', () => {
    expect(getTCGAlbumCardPrimaryAction(true)).toBe('view');
  });
});

describe('getTCGCardAccessibleName', () => {
  it('includes the collector number so cards with the same name remain distinguishable', async () => {
    const helpers = await import('./tcg-album-card-actions');
    const getAccessibleName = Reflect.get(helpers, 'getTCGCardAccessibleName');

    expect(typeof getAccessibleName).toBe('function');
    if (typeof getAccessibleName === 'function') {
      expect(getAccessibleName('Bulbasaur', '001')).toBe('Bulbasaur #001');
      expect(getAccessibleName('Bulbasaur', '166')).toBe('Bulbasaur #166');
    }
  });
});
