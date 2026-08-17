export interface MoveDetail {
  id: number;
  name: string;
  names?: {
    name: string;
    language: { name: string };
  }[];
  accuracy: number | null;
  effect_chance: number | null;
  pp: number;
  priority: number;
  power: number | null;
  damage_class: { name: 'physical' | 'special' | 'status' };
  type: { name: string };
  generation: { name: string };
  effect_entries: {
    effect: string;
    short_effect: string;
    language: { name: string };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version_group: { name: string };
  }[];
  learned_by_pokemon: { name: string; url: string }[];
  machines: {
    machine: { url: string };
    version_group: { name: string };
  }[];
}
