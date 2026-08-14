import { describe, expect, it } from 'vitest';
import { isAuthSensitivePath } from './AuthProvider';

describe('isAuthSensitivePath', () => {
  it('recognizes localized authenticated routes', () => {
    expect(isAuthSensitivePath('/fr/friends')).toBe(true);
    expect(isAuthSensitivePath('/ja/dashboard')).toBe(true);
    expect(isAuthSensitivePath('/en/tcg/collection')).toBe(true);
    expect(isAuthSensitivePath('/zh/tcg/wishlist/expansions')).toBe(true);
  });

  it('initializes auth on every non-home route with the shared header', () => {
    expect(isAuthSensitivePath('/fr/pokedex')).toBe(true);
    expect(isAuthSensitivePath('/about')).toBe(true);
    expect(isAuthSensitivePath('/fr/about')).toBe(true);
    expect(isAuthSensitivePath('/')).toBe(false);
    expect(isAuthSensitivePath('/fr')).toBe(false);
  });
});
