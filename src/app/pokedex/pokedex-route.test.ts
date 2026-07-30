import { describe, expect, it } from 'vitest';
import en from '../../lib/i18n/en';
import { buildSubpathLanguages } from '@/lib/seo';

describe('Pokédex route contract', () => {
  it('has localized metadata copy and reciprocal localized routes', () => {
    expect(en.translation.pokedex.title).toBe('Pokédex');
    expect(en.translation.pokedex.meta_title).not.toContain('PrimeDex');
    expect(buildSubpathLanguages('/pokedex')).toEqual({
      en: '/en/pokedex', fr: '/fr/pokedex', es: '/es/pokedex', de: '/de/pokedex',
      it: '/it/pokedex', ja: '/ja/pokedex', ko: '/ko/pokedex', zh: '/zh/pokedex', 'x-default': '/en/pokedex',
    });
  });
});
