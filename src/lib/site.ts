export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lunidex.app';
// Public canonical URLs use the Lunidex domain; legacy storage and package identifiers stay unchanged.
// Storage keys intentionally retain their legacy PrimeDex prefix so existing
// local collections continue to load after the public rebrand.
export const SITE_NAME = 'Lunidex';
export const SITE_TAGLINE = 'Pokémon TCG collection tracker and Pokémon workspace';
export const SITE_DESCRIPTION =
  'Track Pokémon TCG sets, owned and missing cards, and collection progress with Lunidex. Explore the Pokédex and build teams too.';
export const SITE_DISAMBIGUATION_DESCRIPTION =
  'Lunidex is an independent, unofficial Pokémon web application for tracking Pokémon TCG sets and collection progress, with Pokédex and team tools. It is not a card marketplace.';
export const SITE_KEYWORDS = [
  'pokemon card collection tracker',
  'pokemon tcg collection',
  'pokemon tcg set tracker',
  'pokemon card checklist',
  'tcg collection app',
  'pokemon card catalog',
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

export const GITHUB_REPO_URL = 'https://github.com/teefloo/Lunidex';
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;


export const PRIMARY_COLOR = '#5243B5';
export const BACKGROUND_COLOR = '#07144F';
export const ACCENT_COLOR = '#8DB4FF';


export const FEATURE_LIST = [
  'Pokémon TCG collection tracker for sets, owned cards, missing cards, and progress',
  'Public Pokémon TCG set checklists and card catalog with set, rarity, type, and HP filters',
  'Complete Pokédex of all 1025 Pokémon across 9 generations',
  'Team Builder with type coverage analysis and synergy scoring',
  'Side-by-side comparison of up to 3 Pokémon with stat radar charts',
  'Interactive type chart for all 18 Pokémon types',
  "Who's That Pokémon? quiz with 6 game modes",
  'Living Dex Tracker with account-backed cloud synchronization',
  'Localized in 8 languages including Japanese, Korean, and Chinese',
  'Advanced search filtering by generation, type, BST, and egg groups',
  'Open-source under the MIT license',
];
