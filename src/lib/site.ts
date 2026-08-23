export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lunidex.app';
// Public canonical URLs use the Lunidex domain; legacy storage and package identifiers stay unchanged.
// Storage keys intentionally retain their legacy PrimeDex prefix so existing
// local collections continue to load after the public rebrand.
export const SITE_NAME = 'Lunidex';
export const SITE_TAGLINE = 'Pokémon Companion for Players and Collectors';
export const SITE_DESCRIPTION =
  'Lunidex is an independent Pokémon web app for Pokédex reference, team building, and Pokémon TCG collection tracking.';
export const SITE_DISAMBIGUATION_DESCRIPTION =
  'Lunidex is an independent, unofficial Pokémon web application for Pokédex reference, team building, and Pokémon TCG collection tracking. It is not a card marketplace.';
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
  'pokemon card collection tracker',
  'pokemon tcg collection',
  'tcg collection app',
  'pokemon card catalog',
  'pokemon weakness',
  'pokemon type chart',
  'best pokemon team',
];

export const GITHUB_REPO_URL = 'https://github.com/teefloo/Poke';
export const GITHUB_DISCUSSIONS_URL = `${GITHUB_REPO_URL}/discussions`;
export const GITHUB_ISSUES_URL = 'https://github.com/teefloo/Poke/issues';
// Retained temporarily for secondary pages; public home metadata and footer do not use them.
export const TWITTER_HANDLE = '@primedex';
export const TWITTER_URL = 'https://twitter.com/primedex';
export const DISCORD_URL = 'https://discord.gg/primedex';
export const SOCIAL_PROFILES = [GITHUB_REPO_URL, TWITTER_URL, DISCORD_URL];


export const PRIMARY_COLOR = '#5243B5';
export const BACKGROUND_COLOR = '#07144F';
export const ACCENT_COLOR = '#8DB4FF';


export const FEATURE_LIST = [
  'Complete Pokédex of all 1025 Pokémon across 9 generations',
  'Team Builder with type coverage analysis and synergy scoring',
  'Side-by-side comparison of up to 3 Pokémon with stat radar charts',
  'Interactive type chart for all 18 Pokémon types',
  'Pokémon TCG catalog with set, rarity, type, and HP filters',
  "Who's That Pokémon? quiz with 6 game modes",
  'Living Dex Tracker with account-backed cloud synchronization',
  'Localized in 8 languages including Japanese, Korean, and Chinese',
  'Advanced search filtering by generation, type, BST, and egg groups',
  'Open-source under the MIT license',
];
