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
