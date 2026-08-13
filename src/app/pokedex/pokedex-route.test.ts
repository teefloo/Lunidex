import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../../lib/i18n/en';
import { buildSubpathLanguages } from '@/lib/seo';

const pageSource = readFileSync(resolve(process.cwd(), 'src/app/pokedex/page.tsx'), 'utf8');

describe('Pokédex route contract', () => {
  it('has localized metadata copy and reciprocal localized routes', () => {
    expect(en.translation.pokedex.title).toBe('Pokédex');
    expect(en.translation.pokedex.meta_title).not.toContain('PrimeDex');
    expect(buildSubpathLanguages('/pokedex')).toEqual({
      en: '/en/pokedex', fr: '/fr/pokedex', es: '/es/pokedex', de: '/de/pokedex',
      it: '/it/pokedex', ja: '/ja/pokedex', ko: '/ko/pokedex', zh: '/zh/pokedex', 'x-default': '/en/pokedex',
    });
  });

  it('does not make the route depend on a successful server-side API prefetch', () => {
    expect(pageSource).toContain('await Promise.allSettled([');
  });
});
