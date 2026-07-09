export type NuzlockeEncounterStatus = 'alive' | 'dead' | 'boxed';

export interface NuzlockeEncounter {
  id: string;
  routeName: string;
  pokemonId: number;
  pokemonName: string;
  nickname: string | null;
  status: NuzlockeEncounterStatus;
  caughtAt: string;
}

export interface NuzlockeRun {
  id: string;
  name: string;
  game: string;
  encounters: NuzlockeEncounter[];
  createdAt: string;
}
