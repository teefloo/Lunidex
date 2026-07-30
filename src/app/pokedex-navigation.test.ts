import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Pokédex return navigation', () => {
  it('keeps Pokémon-specific return actions on the dedicated Pokédex route', () => {
    for (const file of ['src/app/compare/page.tsx', 'src/app/team/page.tsx', 'src/app/pokemon/[name]/PokemonDetailClient.tsx', 'src/app/favorites/page.tsx']) {
      expect(readFileSync(resolve(root, file), 'utf8')).toContain("'/pokedex'");
    }
  });
});
