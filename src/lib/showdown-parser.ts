export interface ParsedShowdownSet {
  raw: string;
  species: string;
  speciesSlug: string;
  nickname: string | null;
  item: string | null;
  ability: string | null;
  level: number | null;
  shiny: boolean;
  gender: 'M' | 'F' | null;
  nature: string | null;
  teraType: string | null;
  evs: Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>;
  ivs: Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>>;
  moves: string[];
}

const STAT_ALIASES: Record<string, 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'> = {
  hp: 'hp',
  atk: 'atk',
  def: 'def',
  spa: 'spa',
  spd: 'spd',
  spe: 'spe',
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function parseStatLine(line: string): Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>> {
  const result: Partial<Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>> = {};
  const parts = line.split('/');
  for (const part of parts) {
    const match = part.trim().match(/^(\d+)\s+([A-Za-z]+)$/);
    if (!match) continue;
    const [, value, stat] = match;
    const key = STAT_ALIASES[stat.toLowerCase()];
    if (key) result[key] = parseInt(value, 10);
  }
  return result;
}

/**
 * Parses a Pokémon Showdown export/paste. Supports multiple sets separated by
 * blank lines. Doesn't validate species/move names against PokéAPI — that
 * matching happens downstream, since this parser has no network access.
 */
export function parseShowdownPaste(text: string): ParsedShowdownSet[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sets: ParsedShowdownSet[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    // Skip lines that are clearly not a set header (e.g. a stray move-only line).
    if (!firstLine || /^[-–]/.test(firstLine)) continue;

    let nickname: string | null = null;
    let species = firstLine;
    let item: string | null = null;
    let gender: 'M' | 'F' | null = null;

    // "Nickname (Species) (M) @ Item" or "Species (M) @ Item" or "Species @ Item"
    const atSplit = firstLine.split('@');
    let headerPart = atSplit[0].trim();
    if (atSplit[1]) item = atSplit[1].trim();

    const genderMatch = headerPart.match(/\((M|F)\)\s*$/);
    if (genderMatch) {
      gender = genderMatch[1] as 'M' | 'F';
      headerPart = headerPart.slice(0, genderMatch.index).trim();
    }

    const nicknameMatch = headerPart.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (nicknameMatch) {
      nickname = nicknameMatch[1].trim();
      species = nicknameMatch[2].trim();
    } else {
      species = headerPart.trim();
    }

    let ability: string | null = null;
    let level: number | null = null;
    let shiny = false;
    let nature: string | null = null;
    let teraType: string | null = null;
    let evs: ParsedShowdownSet['evs'] = {};
    let ivs: ParsedShowdownSet['ivs'] = {};
    const moves: string[] = [];

    for (const line of lines.slice(1)) {
      if (/^ability:/i.test(line)) {
        ability = line.replace(/^ability:/i, '').trim();
      } else if (/^level:/i.test(line)) {
        const lvl = parseInt(line.replace(/^level:/i, '').trim(), 10);
        if (!Number.isNaN(lvl)) level = lvl;
      } else if (/^shiny:/i.test(line)) {
        shiny = /yes/i.test(line);
      } else if (/^evs:/i.test(line)) {
        evs = parseStatLine(line.replace(/^evs:/i, ''));
      } else if (/^ivs:/i.test(line)) {
        ivs = parseStatLine(line.replace(/^ivs:/i, ''));
      } else if (/^tera type:/i.test(line)) {
        teraType = line.replace(/^tera type:/i, '').trim();
      } else if (/nature\s*$/i.test(line)) {
        nature = line.replace(/nature\s*$/i, '').trim();
      } else if (/^[-–]\s*/.test(line)) {
        const move = line.replace(/^[-–]\s*/, '').trim();
        if (move) moves.push(move);
      }
    }

    sets.push({
      raw: block,
      species,
      speciesSlug: slugify(species),
      nickname: nickname && nickname !== species ? nickname : null,
      item,
      ability,
      level,
      shiny,
      gender,
      nature,
      teraType,
      evs,
      ivs,
      moves,
    });
  }

  return sets;
}
