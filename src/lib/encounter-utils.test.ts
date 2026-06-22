import { describe, it, expect } from 'vitest';
import {
  groupEncountersByVersionGroup,
  resolveVersionGroup,
} from './encounter-utils';
import type { PokemonEncounter } from '@/types/pokemon';

const makeEncounter = (
  locationArea: string,
  versions: Array<{
    version: string;
    details: Array<{
      method: string;
      chance: number;
      min: number;
      max: number;
      conditions?: string[];
    }>;
  }>
): PokemonEncounter => ({
  location_area: { name: locationArea, url: `https://x/${locationArea}` },
  version_details: versions.map((v) => ({
    max_chance: Math.max(...v.details.map((d) => d.chance)),
    version: { name: v.version, url: `https://x/${v.version}` },
    encounter_details: v.details.map((d) => ({
      chance: d.chance,
      condition_values: (d.conditions ?? []).map((c) => ({ name: c, url: `https://x/${c}` })),
      method: { name: d.method, url: `https://x/${d.method}` },
      min_level: d.min,
      max_level: d.max,
    })),
  })),
});

describe('resolveVersionGroup', () => {
  it('maps a known version to its parent group', () => {
    expect(resolveVersionGroup('red')).toBe('red-blue');
    expect(resolveVersionGroup('firered')).toBe('firered-leafgreen');
  });

  it('falls back to the version name when unmapped', () => {
    expect(resolveVersionGroup('mystery-version')).toBe('mystery-version');
  });
});

describe('groupEncountersByVersionGroup', () => {
  it('returns an empty array for no encounters', () => {
    expect(groupEncountersByVersionGroup([])).toEqual([]);
  });

  it('groups sibling versions under one version-group', () => {
    const result = groupEncountersByVersionGroup([
      makeEncounter('viridian-forest-area', [
        { version: 'red', details: [{ method: 'walk', chance: 50, min: 3, max: 5 }] },
        { version: 'blue', details: [{ method: 'walk', chance: 45, min: 3, max: 5 }] },
      ]),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].versionGroup).toBe('red-blue');
    expect(result[0].versions).toEqual(['red', 'blue']);
    expect(result[0].locations).toHaveLength(1);
    expect(result[0].locations[0].locationArea).toBe('viridian-forest-area');
    expect(result[0].locations[0].entries).toHaveLength(2);
  });

  it('preserves method, chance, level range and conditions on each entry', () => {
    const [group] = groupEncountersByVersionGroup([
      makeEncounter('route-1-area', [
        {
          version: 'red',
          details: [{ method: 'walk', chance: 20, min: 2, max: 4, conditions: ['time-night'] }],
        },
      ]),
    ]);

    expect(group.locations[0].entries[0]).toEqual({
      version: 'red',
      method: 'walk',
      chance: 20,
      minLevel: 2,
      maxLevel: 4,
      conditions: ['time-night'],
    });
  });

  it('orders version-groups by generation, unknown groups last', () => {
    const result = groupEncountersByVersionGroup([
      makeEncounter('area', [
        { version: 'scarlet', details: [{ method: 'walk', chance: 10, min: 5, max: 5 }] },
        { version: 'red', details: [{ method: 'walk', chance: 10, min: 5, max: 5 }] },
        { version: 'made-up', details: [{ method: 'walk', chance: 10, min: 5, max: 5 }] },
      ]),
    ]);

    expect(result.map((g) => g.versionGroup)).toEqual([
      'red-blue',
      'scarlet-violet',
      'made-up',
    ]);
  });

  it('keeps separate location areas within the same version-group', () => {
    const [group] = groupEncountersByVersionGroup([
      makeEncounter('route-1-area', [
        { version: 'red', details: [{ method: 'walk', chance: 50, min: 2, max: 4 }] },
      ]),
      makeEncounter('route-2-area', [
        { version: 'red', details: [{ method: 'walk', chance: 30, min: 3, max: 5 }] },
      ]),
    ]);

    expect(group.locations.map((l) => l.locationArea)).toEqual([
      'route-1-area',
      'route-2-area',
    ]);
  });
});
