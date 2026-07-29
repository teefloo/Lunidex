export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://primedex.vercel.app';
// Keep the current deployment URL until the Lunidex domain is purchased.
// Storage keys intentionally retain their legacy PrimeDex prefix so existing
// local collections continue to load after the public rebrand.
export const SITE_NAME = 'Lunidex';
export const SITE_TAGLINE = 'Pokémon Companion for Players and Collectors';
export const SITE_DESCRIPTION =
  'A free Pokémon companion for players and TCG collectors. Explore the Pokédex, build teams, track cards, and complete your collection.';
export const SITE_KEYWORDS = [
  'pokedex',
  'pokemon',
  'pokédex',
  'pokémon',
  'pokemon database',
  'pokemon stats',
  'pokemon types',
  'pokemon team builder',
  'pokemon evolution',
  'pokemon moves',
  'competitive pokemon',
  'pokemon builds',
  'pokemon comparison',
  'pokedex online',
  'all pokemon',
  'pokemon guide',
  'pokemon wiki',
  'shiny pokemon',
  'pokemon quiz',
  'pokemon cards',
  'pokemon weakness',
  'pokemon type chart',
  'best pokemon team',
];

export const GITHUB_REPO_URL = 'https://github.com/teefloo/Poke';
export const GITHUB_ISSUES_URL = 'https://github.com/teefloo/Poke/issues';

export const TWITTER_HANDLE = '@primedex';
export const TWITTER_URL = 'https://twitter.com/primedex';
export const DISCORD_URL = 'https://discord.gg/primedex';

export const PRIMARY_COLOR = '#E8916B';
export const BACKGROUND_COLOR = '#211A17';
export const ACCENT_COLOR = '#A8C5E0';

export const SOCIAL_PROFILES = [
  GITHUB_REPO_URL,
  TWITTER_URL,
  DISCORD_URL,
];

export const FEATURE_LIST = [
  'Complete Pokédex of all 1025 Pokémon across 9 generations',
  'Team Builder with type coverage analysis and synergy scoring',
  'Side-by-side comparison of up to 3 Pokémon with stat radar charts',
  'Interactive type chart for all 18 Pokémon types',
  'Pokémon TCG catalog with set, rarity, type, and HP filters',
  "Who's That Pokémon? quiz with 6 game modes",
  'Living Dex Tracker with local storage persistence',
  'Localized in 8 languages including Japanese, Korean, and Chinese',
  'Advanced search filtering by generation, type, BST, and egg groups',
  'Free and open-source under the MIT license',
];
