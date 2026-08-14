import { describe, expect, it } from 'vitest';
import { isAuthSensitivePath } from './AuthProvider';

describe('isAuthSensitivePath', () => {
  it('recognizes localized authenticated routes', () => {
    expect(isAuthSensitivePath('/fr/friends')).toBe(true);
    expect(isAuthSensitivePath('/ja/dashboard')).toBe(true);
    expect(isAuthSensitivePath('/en/tcg/collection')).toBe(true);
    expect(isAuthSensitivePath('/zh/tcg/wishlist/expansions')).toBe(true);
  });

  it('initializes auth on every route with shared session controls', () => {
    expect(isAuthSensitivePath('/fr/pokedex')).toBe(true);
    expect(isAuthSensitivePath('/about')).toBe(true);
    expect(isAuthSensitivePath('/fr/about')).toBe(true);
    expect(isAuthSensitivePath('/')).toBe(true);
    expect(isAuthSensitivePath('/fr')).toBe(true);
  });
});
