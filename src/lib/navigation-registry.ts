import {
  ArrowLeftRight,
  BookOpen,
  BrainCircuit,
  Calculator,
  Egg,
  Heart,
  HelpCircle,
  LayoutGrid,
  Newspaper,
  Package,
  Settings,
  Shapes,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { SupportedLanguage } from '@/lib/languages';

export type NavigationGroup = 'collection' | 'catalog' | 'pokedex' | 'play' | 'space' | 'resources';
export type PrimaryNavigationId = 'collection' | 'catalog' | 'pokedex' | 'play';

export interface NavigationDestination {
  id: string;
  path: string | null;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  group: NavigationGroup;
  primary?: PrimaryNavigationId;
  /** Keep focused reference pages searchable without expanding the global menu. */
  paletteOnly?: boolean;
  routeMatches?: readonly string[];
  aliases?: Partial<Record<SupportedLanguage, readonly string[]>>;
  action?: 'settings';
}

export const NAVIGATION_GROUPS: Record<NavigationGroup, { labelKey: string; fallback: string }> = {
  collection: { labelKey: 'tcg.nav_collection', fallback: 'Collection' },
  catalog: { labelKey: 'tcg.nav_catalog', fallback: 'TCG catalog' },
  pokedex: { labelKey: 'nav.pokedex', fallback: 'Pokédex references' },
  play: { labelKey: 'nav.play', fallback: 'Play' },
  space: { labelKey: 'nav.my_space', fallback: 'My space' },
  resources: { labelKey: 'nav.resources', fallback: 'Resources' },
};

/**
 * The application navigation inventory. Header menus, the persistent mobile
 * bar, contextual TCG navigation, and page search all derive their links here.
 */
export const NAVIGATION_DESTINATIONS: readonly NavigationDestination[] = [
  { id: 'collection', path: '/tcg/collection', labelKey: 'tcg.nav_collection', fallback: 'Collection', icon: Package, group: 'collection', primary: 'collection', aliases: { en: ['my cards', 'card collection', 'binder'], fr: ['ma collection', 'mes cartes', 'collection de cartes', 'classeur'], es: ['mi colección', 'mis cartas'], de: ['meine sammlung', 'meine karten'], it: ['la mia collezione', 'le mie carte'], ja: ['コレクション'], ko: ['컬렉션'], zh: ['收藏'] } },
  { id: 'catalog', path: '/tcg', labelKey: 'tcg.nav_catalog', fallback: 'TCG catalog', icon: LayoutGrid, group: 'catalog', primary: 'catalog', aliases: { en: ['trading cards', 'card catalog', 'tcg'], fr: ['catalogue jcc', 'cartes pokémon', 'cartes à collectionner', 'jcc'], es: ['catálogo de cartas', 'cartas coleccionables'], de: ['kartensammlung', 'sammelkarten'], it: ['catalogo carte', 'carte collezionabili'], ja: ['カードカタログ'], ko: ['카드 카탈로그'], zh: ['卡牌图鉴'] } },
  { id: 'pokedex', path: '/pokedex', labelKey: 'nav.pokedex', fallback: 'Pokédex', icon: BookOpen, group: 'pokedex', primary: 'pokedex', routeMatches: ['/pokemon'], aliases: { fr: ['pokédex', 'pokedex'], es: ['pokédex', 'pokedex'] } },
  { id: 'play', path: '/team', labelKey: 'nav.play', fallback: 'Play', icon: Users, group: 'play', primary: 'play', aliases: { en: ['team builder', 'team'], fr: ['jouer', 'équipe', 'team'], es: ['jugar', 'equipo'], de: ['spielen', 'team'], it: ['gioca', 'squadra'], ja: ['プレイ', 'チーム'], ko: ['플레이', '팀'], zh: ['游玩', '队伍'] } },

  { id: 'wishlist', path: '/tcg/wishlist', labelKey: 'tcg.nav_wishlist', fallback: 'Wishlist', icon: Heart, group: 'collection' },
  { id: 'sealed-portfolio', path: '/tcg/sealed', labelKey: 'tcg.nav_sealed', fallback: 'Sealed portfolio', icon: Package, group: 'collection' },
  { id: 'collection-start', path: '/tcg/start', labelKey: 'lunidex_home.cta_start', fallback: 'Start or resume your collection', icon: Package, group: 'collection' },

  { id: 'sealed-market', path: '/tcg/sealed/market', labelKey: 'tcg.nav_sealed_market', fallback: 'Sealed market', icon: Package, group: 'catalog', routeMatches: ['/tcg/sealed/buy-safely', '/tcg/sealed/releases'], aliases: { fr: ['marché des produits scellés', 'produits scellés'], en: ['sealed products', 'sealed prices'] } },
  { id: 'deck-builder', path: '/tcg/deck-builder', labelKey: 'tcg.nav_deck_builder', fallback: 'Deck builder', icon: LayoutGrid, group: 'catalog', aliases: { fr: ['deck', 'construction de deck'], en: ['deck'] } },
  { id: 'pull-rates', path: '/tcg/pull-rates', labelKey: 'booster_guides.links.pull', fallback: 'Pull rates', icon: Sparkles, group: 'catalog', aliases: { fr: ['fréquences de tirage', 'taux de tirage'], en: ['card odds', 'pack odds'] } },
  { id: 'booster-value', path: '/tcg/booster-value', labelKey: 'booster_guides.links.value', fallback: 'Booster value', icon: Calculator, group: 'catalog', aliases: { fr: ['valeur des boosters'], en: ['booster calculator'] } },

  { id: 'types', path: '/types', labelKey: 'nav.types', fallback: 'Types', icon: Shapes, group: 'pokedex', aliases: { fr: ['types pokemon', 'types pokémon'] } },
  { id: 'moves', path: '/moves', labelKey: 'nav.moves', fallback: 'Moves', icon: Swords, group: 'pokedex', aliases: { fr: ['attaques', 'capacités'] } },
  { id: 'abilities', path: '/abilities', labelKey: 'nav.abilities', fallback: 'Abilities', icon: Sparkles, group: 'pokedex', aliases: { fr: ['talents'] } },
  { id: 'items', path: '/items', labelKey: 'nav.items', fallback: 'Items', icon: Package, group: 'pokedex', aliases: { fr: ['objets'] } },
  { id: 'favorites', path: '/favorites', labelKey: 'nav.favorites', fallback: 'Favorites', icon: Heart, group: 'space', aliases: { fr: ['favoris'] } },

  { id: 'quiz', path: '/quiz', labelKey: 'nav.quiz', fallback: 'Quiz', icon: BrainCircuit, group: 'play', aliases: { fr: ['quiz pokemon', 'quiz pokémon'] } },
  { id: 'nuzlocke', path: '/nuzlocke', labelKey: 'nuzlocke.title', fallback: 'Nuzlocke tracker', icon: Trophy, group: 'play', aliases: { fr: ['suivi nuzlocke'] } },
  { id: 'compare', path: '/compare', labelKey: 'nav.compare', fallback: 'Compare Pokémon', icon: ArrowLeftRight, group: 'play' },
  { id: 'battle', path: '/battle', labelKey: 'nav.battle', fallback: 'Battle tools', icon: Shield, group: 'play' },
  { id: 'breeding', path: '/breeding', labelKey: 'nav.breeding', fallback: 'Breeding', icon: Egg, group: 'play', aliases: { fr: ['reproduction', 'élevage'] } },
  { id: 'ev-iv', path: '/ev-iv', labelKey: 'nav.ev_iv', fallback: 'EV/IV calculator', icon: Calculator, group: 'play', aliases: { fr: ['calculateur ev iv', 'calculateur ev/iv'] } },

  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', fallback: 'Dashboard', icon: Users, group: 'space', aliases: { fr: ['tableau de bord', 'mon espace'] } },
  { id: 'friends', path: '/friends', labelKey: 'friends.title', fallback: 'Friends', icon: Users, group: 'space', aliases: { fr: ['amis'] } },
  { id: 'settings', path: null, labelKey: 'nav.settings', fallback: 'Settings', icon: Settings, group: 'space', action: 'settings', aliases: { fr: ['paramètres', 'preferences', 'préférences'] } },

  { id: 'blog', path: '/blog', labelKey: 'nav.blog', fallback: 'Blog', icon: Newspaper, group: 'resources' },
  { id: 'guides', path: '/guides/pokemon-card-collection-tracker', labelKey: 'nav.guides', fallback: 'Guides', icon: BookOpen, group: 'resources', aliases: { fr: ['guide collection de cartes', 'guide du pokédex'] } },
  { id: 'pokemon-reference-guide', path: '/guides/pokemon-reference-guide', labelKey: 'nav.guide_pokedex', fallback: 'Pokédex reference guide', icon: BookOpen, group: 'resources', paletteOnly: true, aliases: { en: ['pokedex guide', 'pokemon reference'], fr: ['guide du pokédex', 'références pokémon'], es: ['guía de la pokédex'], de: ['pokédex guide'], it: ['guida pokédex'], ja: ['ポケモン図鑑ガイド'], ko: ['도감 가이드'], zh: ['图鉴指南'] } },
  { id: 'team-builder-guide', path: '/guides/team-builder-guide', labelKey: 'nav.guide_team', fallback: 'Team building guide', icon: BookOpen, group: 'resources', paletteOnly: true, aliases: { en: ['team guide', 'team builder guide'], fr: ['guide équipe', 'guide de composition'], es: ['guía de equipo'], de: ['team guide'], it: ['guida squadra'], ja: ['チーム構築ガイド'], ko: ['팀 구성 가이드'], zh: ['队伍构筑指南'] } },
  { id: 'quiz-guide', path: '/guides/quiz-guide', labelKey: 'nav.guide_quiz', fallback: 'Quiz guide', icon: BookOpen, group: 'resources', paletteOnly: true, aliases: { en: ['quiz guide'], fr: ['guide du quiz'], es: ['guía del quiz'], de: ['quiz guide'], it: ['guida quiz'], ja: ['クイズガイド'], ko: ['퀴즈 가이드'], zh: ['问答指南'] } },
  { id: 'nuzlocke-guide', path: '/guides/nuzlocke-guide', labelKey: 'nav.guide_nuzlocke', fallback: 'Nuzlocke guide', icon: BookOpen, group: 'resources', paletteOnly: true, aliases: { en: ['nuzlocke guide'], fr: ['guide nuzlocke'], es: ['guía nuzlocke'], de: ['nuzlocke guide'], it: ['guida nuzlocke'], ja: ['ヌズロックガイド'], ko: ['너즐록 가이드'], zh: ['Nuzlocke 指南'] } },
  { id: 'team-tools-guide', path: '/guides/team-tools-guide', labelKey: 'nav.guide_team_tools', fallback: 'Team tools guide', icon: BookOpen, group: 'resources', paletteOnly: true, aliases: { en: ['team tools guide'], fr: ['guide des outils d’équipe'], es: ['guía de herramientas de equipo'], de: ['team tools guide'], it: ['guida strumenti squadra'], ja: ['チームツールガイド'], ko: ['팀 도구 가이드'], zh: ['队伍工具指南'] } },
  { id: 'docs', path: '/docs', labelKey: 'nav.docs', fallback: 'Documentation and API', icon: BookOpen, group: 'resources', aliases: { fr: ['documentation', 'api'] } },
  { id: 'anniversary', path: '/30e-anniversaire', labelKey: 'nav.anniversary', fallback: 'Anniversary tracker', icon: Trophy, group: 'resources', aliases: { fr: ['tracker anniversaire', '30e anniversaire'] } },
  { id: 'faq', path: '/faq', labelKey: 'nav.faq', fallback: 'FAQ', icon: HelpCircle, group: 'resources', aliases: { fr: ['aide', 'questions fréquentes'] } },
  { id: 'about', path: '/about', labelKey: 'nav.about', fallback: 'About Lunidex', icon: BookOpen, group: 'resources', aliases: { fr: ['à propos', 'présentation'] } },
  { id: 'contact', path: '/contact', labelKey: 'nav.contact', fallback: 'Contact', icon: Users, group: 'resources' },
  { id: 'compare-article', path: '/compare/lunidex-vs-pokecardex-zebradex', labelKey: 'nav.comparison_article', fallback: 'Collector app comparison', icon: ArrowLeftRight, group: 'resources' },
] as const satisfies readonly NavigationDestination[];

export const PRIMARY_NAVIGATION = NAVIGATION_DESTINATIONS.filter(
  (destination): destination is NavigationDestination & { primary: PrimaryNavigationId } => Boolean(destination.primary),
);

export function normalizeNavigationPath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  const segments = path.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isSupportedLanguage(first)) segments.shift();
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

export function resolveNavigationDestination(pathname: string): NavigationDestination | null {
  const path = normalizeNavigationPath(pathname);
  const candidates = NAVIGATION_DESTINATIONS
    .map((destination) => ({
      destination,
      matchingLength: [destination.path, ...(destination.routeMatches ?? [])]
        .filter((route): route is string => route !== null && route !== undefined && pathMatches(path, route))
        .reduce((longest, route) => Math.max(longest, route.length), 0),
    }))
    .filter(({ matchingLength }) => matchingLength > 0)
    .sort((left, right) => right.matchingLength - left.matchingLength);
  return candidates[0]?.destination ?? null;
}

export function resolveActivePrimaryNavigation(pathname: string): PrimaryNavigationId | null {
  const destination = resolveNavigationDestination(pathname);
  if (!destination) return null;
  if (destination.primary) return destination.primary;
  if (destination.group === 'collection' || destination.group === 'catalog'
    || destination.group === 'pokedex' || destination.group === 'play') {
    return destination.group;
  }
  return null;
}

export function matchesDestinationSearch(
  destination: NavigationDestination,
  query: string,
  language: SupportedLanguage,
  translatedLabel: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const searchable = [
    translatedLabel,
    destination.fallback,
    destination.path ?? '',
    ...(destination.aliases?.[language] ?? []),
    ...Object.values(destination.aliases ?? {}).flat(),
  ].map(normalizeSearchText);
  return searchable.some((value) => value.includes(normalizedQuery));
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
}

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value === 'en' || value === 'fr' || value === 'es' || value === 'de'
    || value === 'it' || value === 'ja' || value === 'ko' || value === 'zh';
}

function pathMatches(path: string, routePath: string): boolean {
  return path === routePath || path.startsWith(`${routePath}/`);
}
