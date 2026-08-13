import { describe, expect, it } from 'vitest';
import { isAuthSensitivePath } from './AuthProvider';

describe('isAuthSensitivePath', () => {
  it('recognizes localized authenticated routes', () => {
    expect(isAuthSensitivePath('/fr/friends')).toBe(true);
    expect(isAuthSensitivePath('/ja/dashboard')).toBe(true);
    expect(isAuthSensitivePath('/en/tcg/collection')).toBe(true);
    expect(isAuthSensitivePath('/zh/tcg/wishlist/expansions')).toBe(true);
  });

  it('keeps public routes out of deferred auth loading', () => {
    expect(isAuthSensitivePath('/fr/pokedex')).toBe(false);
    expect(isAuthSensitivePath('/about')).toBe(false);
    expect(isAuthSensitivePath('/')).toBe(false);
  });
});
