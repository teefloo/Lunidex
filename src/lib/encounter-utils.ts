import type { PokemonEncounter } from '@/types/pokemon';

/**
 * Maps a PokéAPI game version (e.g. `red`, `firered`) to its parent
 * version-group (e.g. `red-blue`, `firered-leafgreen`). Versions absent from
 * this table fall back to their own name so nothing is ever dropped.
 */
export const VERSION_GROUP_BY_VERSION: Record<string, string> = {
  red: 'red-blue',
  blue: 'red-blue',
  yellow: 'yellow',
  gold: 'gold-silver',
  silver: 'gold-silver',
  crystal: 'crystal',
  ruby: 'ruby-sapphire',
  sapphire: 'ruby-sapphire',
  emerald: 'emerald',
  firered: 'firered-leafgreen',
  leafgreen: 'firered-leafgreen',
  diamond: 'diamond-pearl',
  pearl: 'diamond-pearl',
  platinum: 'platinum',
  heartgold: 'heartgold-soulsilver',
  soulsilver: 'heartgold-soulsilver',
  black: 'black-white',
  white: 'black-white',
  'black-2': 'black-2-white-2',
  'white-2': 'black-2-white-2',
  x: 'x-y',
  y: 'x-y',
  'omega-ruby': 'omega-ruby-alpha-sapphire',
  'alpha-sapphire': 'omega-ruby-alpha-sapphire',
  sun: 'sun-moon',
  moon: 'sun-moon',
  'ultra-sun': 'ultra-sun-ultra-moon',
  'ultra-moon': 'ultra-sun-ultra-moon',
  'lets-go-pikachu': 'lets-go-pikachu-lets-go-eevee',
  'lets-go-eevee': 'lets-go-pikachu-lets-go-eevee',
  sword: 'sword-shield',
  shield: 'sword-shield',
  'brilliant-diamond': 'brilliant-diamond-and-shining-pearl',
  'shining-pearl': 'brilliant-diamond-and-shining-pearl',
  'legends-arceus': 'legends-arceus',
  scarlet: 'scarlet-violet',
  violet: 'scarlet-violet',
  colosseum: 'colosseum',
  xd: 'xd',
};

/**
 * Display order for version-groups, oldest generation first. Groups not listed
 * here are appended afterwards in first-seen order.
 */
const VERSION_GROUP_ORDER: readonly string[] = [
  'red-blue',
  'yellow',
  'gold-silver',
  'crystal',
  'ruby-sapphire',
  'emerald',
  'firered-leafgreen',
  'colosseum',
  'xd',
  'diamond-pearl',
  'platinum',
  'heartgold-soulsilver',
  'black-white',
  'black-2-white-2',
  'x-y',
  'omega-ruby-alpha-sapphire',
  'sun-moon',
  'ultra-sun-ultra-moon',
  'lets-go-pikachu-lets-go-eevee',
  'sword-shield',
  'brilliant-diamond-and-shining-pearl',
  'legends-arceus',
  'scarlet-violet',
];

/**
 * Canonical, language-neutral labels for each version-group (game brand names).
 * Used as the section heading; consumers fall back to a formatted slug when a
 * group is missing here.
 */
export const VERSION_GROUP_LABELS: Record<string, string> = {
  'red-blue': 'Red · Blue',
  yellow: 'Yellow',
  'gold-silver': 'Gold · Silver',
  crystal: 'Crystal',
  'ruby-sapphire': 'Ruby · Sapphire',
  emerald: 'Emerald',
  'firered-leafgreen': 'FireRed · LeafGreen',
  colosseum: 'Colosseum',
  xd: 'XD: Gale of Darkness',
  'diamond-pearl': 'Diamond · Pearl',
  platinum: 'Platinum',
  'heartgold-soulsilver': 'HeartGold · SoulSilver',
  'black-white': 'Black · White',
  'black-2-white-2': 'Black 2 · White 2',
  'x-y': 'X · Y',
  'omega-ruby-alpha-sapphire': 'Omega Ruby · Alpha Sapphire',
  'sun-moon': 'Sun · Moon',
  'ultra-sun-ultra-moon': 'Ultra Sun · Ultra Moon',
  'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu · Eevee",
  'sword-shield': 'Sword · Shield',
  'brilliant-diamond-and-shining-pearl': 'Brilliant Diamond · Shining Pearl',
  'legends-arceus': 'Legends: Arceus',
  'scarlet-violet': 'Scarlet · Violet',
};

export interface EncounterEntry {
  /** Raw version slug, e.g. `red`. */
  version: string;
  /** Raw encounter-method slug, e.g. `walk`, `old-rod`. */
  method: string;
  /** Encounter chance as a percentage (0–100). */
  chance: number;
  minLevel: number;
  maxLevel: number;
  /** Raw condition-value slugs, e.g. `time-morning`. */
  conditions: string[];
}

export interface EncounterLocationGroup {
  /** Raw location-area slug, e.g. `pallet-town-area`. */
  locationArea: string;
  entries: EncounterEntry[];
}

export interface EncounterVersionGroup {
  /** Version-group slug (or a raw version slug when unmapped). */
  versionGroup: string;
  /** Distinct version slugs present in this group, in first-seen order. */
  versions: string[];
  locations: EncounterLocationGroup[];
}

export const resolveVersionGroup = (version: string): string =>
  VERSION_GROUP_BY_VERSION[version] ?? version;

/**
 * Transforms the raw PokéAPI encounter payload into a structure grouped by
 * version-group → location area → encounter entries. Pure and deterministic so
 * it can be unit-tested in isolation.
 */
export function groupEncountersByVersionGroup(
  encounters: PokemonEncounter[]
): EncounterVersionGroup[] {
  const groups = new Map<
    string,
    {
      versionGroup: string;
      versions: string[];
      locations: Map<string, EncounterEntry[]>;
    }
  >();

  for (const encounter of encounters) {
    const locationArea = encounter.location_area.name;

    for (const versionDetail of encounter.version_details) {
      const version = versionDetail.version.name;
      const groupKey = resolveVersionGroup(version);

      let group = groups.get(groupKey);
      if (!group) {
        group = { versionGroup: groupKey, versions: [], locations: new Map() };
        groups.set(groupKey, group);
      }
      if (!group.versions.includes(version)) {
        group.versions.push(version);
      }

      let entries = group.locations.get(locationArea);
      if (!entries) {
        entries = [];
        group.locations.set(locationArea, entries);
      }

      for (const detail of versionDetail.encounter_details) {
        entries.push({
          version,
          method: detail.method.name,
          chance: detail.chance,
          minLevel: detail.min_level,
          maxLevel: detail.max_level,
          conditions: detail.condition_values.map((c) => c.name),
        });
      }
    }
  }

  const result: EncounterVersionGroup[] = Array.from(groups.values()).map((group) => ({
    versionGroup: group.versionGroup,
    versions: group.versions,
    locations: Array.from(group.locations.entries()).map(([locationArea, entries]) => ({
      locationArea,
      entries,
    })),
  }));

  return result.sort((a, b) => {
    const ai = VERSION_GROUP_ORDER.indexOf(a.versionGroup);
    const bi = VERSION_GROUP_ORDER.indexOf(b.versionGroup);
    if (ai === -1 && bi === -1) return a.versionGroup.localeCompare(b.versionGroup);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
