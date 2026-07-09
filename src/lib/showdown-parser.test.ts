import { describe, it, expect } from 'vitest';
import { parseShowdownPaste } from './showdown-parser';

describe('parseShowdownPaste', () => {
  it('parses a single full set', () => {
    const text = `Landorus-Therian @ Choice Scarf
Ability: Intimidate
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- U-turn
- Stone Edge
- Explosion`;

    const [set] = parseShowdownPaste(text);
    expect(set.species).toBe('Landorus-Therian');
    expect(set.speciesSlug).toBe('landorus-therian');
    expect(set.item).toBe('Choice Scarf');
    expect(set.ability).toBe('Intimidate');
    expect(set.nature).toBe('Jolly');
    expect(set.evs).toEqual({ atk: 252, spd: 4, spe: 252 });
    expect(set.moves).toEqual(['Earthquake', 'U-turn', 'Stone Edge', 'Explosion']);
  });

  it('parses nickname and gender', () => {
    const text = `Big Bird (Talonflame) (M) @ Sharp Beak
Ability: Gale Wings
Level: 50
Shiny: Yes
- Brave Bird`;

    const [set] = parseShowdownPaste(text);
    expect(set.nickname).toBe('Big Bird');
    expect(set.species).toBe('Talonflame');
    expect(set.gender).toBe('M');
    expect(set.level).toBe(50);
    expect(set.shiny).toBe(true);
  });

  it('parses multiple sets separated by blank lines', () => {
    const text = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt

Charizard @ Charizardite Y
Ability: Blaze
- Flamethrower`;

    const sets = parseShowdownPaste(text);
    expect(sets).toHaveLength(2);
    expect(sets[0].species).toBe('Pikachu');
    expect(sets[1].species).toBe('Charizard');
  });

  it('handles a set with no item', () => {
    const text = `Ditto
Ability: Imposter
- Transform`;

    const [set] = parseShowdownPaste(text);
    expect(set.species).toBe('Ditto');
    expect(set.item).toBeNull();
  });
});
