import { describe, it, expect } from 'vitest';
import {
  cn,
  formatId,
  capitalize,
  formatName,
  formatPokemonSlugName,
  formatLocationName,
} from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('merges conflicting tailwind utilities (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatId', () => {
  it('pads to three digits with a leading hash', () => {
    expect(formatId(1)).toBe('#001');
    expect(formatId(25)).toBe('#025');
    expect(formatId(150)).toBe('#150');
  });

  it('does not truncate ids beyond three digits', () => {
    expect(formatId(1025)).toBe('#1025');
  });
});

describe('capitalize', () => {
  it('uppercases the first character', () => {
    expect(capitalize('pikachu')).toBe('Pikachu');
  });

  it('returns empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  it('leaves the remainder of the string untouched', () => {
    expect(capitalize('mewTWO')).toBe('MewTWO');
  });
});

describe('formatName', () => {
  it('title-cases each hyphen-separated word and joins with spaces', () => {
    expect(formatName('mr-mime')).toBe('Mr Mime');
    expect(formatName('ho-oh')).toBe('Ho Oh');
  });

  it('handles a single word', () => {
    expect(formatName('bulbasaur')).toBe('Bulbasaur');
  });

  it('returns empty string unchanged', () => {
    expect(formatName('')).toBe('');
  });
});

describe('formatPokemonSlugName', () => {
  it('title-cases each part but preserves hyphens', () => {
    expect(formatPokemonSlugName('charizard-mega-x')).toBe('Charizard-Mega-X');
  });

  it('tolerates empty segments from double hyphens', () => {
    expect(formatPokemonSlugName('a--b')).toBe('A--B');
  });
});

describe('formatLocationName', () => {
  it('applies known replacements', () => {
    expect(formatLocationName('route-1')).toBe('Route 1');
    expect(formatLocationName('paldea-area')).toBe('Paldea Area');
  });

  it('falls back to capitalization for unknown words', () => {
    expect(formatLocationName('mysterious-zone')).toBe('Mysterious Zone');
  });

  it('returns empty string unchanged', () => {
    expect(formatLocationName('')).toBe('');
  });
});
