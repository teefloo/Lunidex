import type { TCGCard, TCGCardCategory } from '@/types/tcg';

export interface TCGHoloData {
  rarity: string;
  supertype: string;
  subtypes: string;
  typeClasses: string[];
  artWindow: string;
  isTrainerGallery: boolean;
  hasHoloEffect: boolean;
}

const BASIC_RARITIES = new Set(['common', 'uncommon', 'rare']);

export function getTCGHoloData(card: TCGCard): TCGHoloData {
  const rarity = getTCGHoloRarity(card);
  const isTrainerGallery = isTrainerGalleryCard(card);

  return {
    rarity,
    supertype: getSupertypeAttribute(card.category),
    subtypes: getSubtypeAttribute(card),
    typeClasses: getTypeClasses(card),
    artWindow: getArtWindow(card),
    isTrainerGallery,
    hasHoloEffect: !BASIC_RARITIES.has(rarity),
  };
}

export function getTCGHoloRarity(card: TCGCard): string {
  const rarity = normalizeText(card.rarity);
  const searchable = normalizeText([card.rarity, card.stage, card.suffix, card.name].filter(Boolean).join(' '));
  const trainerGallery = isTrainerGalleryCard(card) || rarity.includes('trainer gallery');

  const isVMAX = hasToken(searchable, 'vmax');
  const isVSTAR = hasToken(searchable, 'vstar');
  const isV = hasToken(searchable, 'v');
  const isEX = hasToken(searchable, 'ex');
  const isGX = hasToken(searchable, 'gx');
  const isVLike = isV || isEX || isGX;

  if (rarity.endsWith('reverse holo') || rarity === 'reverse holo') {
    return rarity || 'reverse holo';
  }

  if (rarity.includes('amazing')) {
    return 'amazing rare';
  }

  if (rarity.includes('radiant') || hasToken(searchable, 'radiant')) {
    return 'radiant rare';
  }

  if (rarity.includes('shiny')) {
    if (isVMAX) return 'rare shiny vmax';
    if (isVLike) return 'rare shiny v';
    return 'rare shiny';
  }

  if (rarity.includes('rainbow')) {
    return 'rare rainbow';
  }

  if (rarity.includes('secret') || rarity.includes('hyper')) {
    return 'rare secret';
  }

  if (rarity.includes('cosmos') || rarity.includes('promo') || card.variants?.wPromo) {
    return 'rare holo cosmos';
  }

  if (isEX || isGX) {
    return 'rare holo v';
  }

  if (trainerGallery && !isVLike && !isVMAX && !isVSTAR) {
    return 'trainer gallery rare holo';
  }

  if (isVMAX) {
    return 'rare holo vmax';
  }

  if (isVSTAR) {
    return 'rare holo vstar';
  }

  if (rarity.includes('double') || (rarity.includes('holo') && isVLike)) {
    return 'rare holo v';
  }

  if (rarity === 'rare' && card.variants?.holo) {
    return 'rare holo';
  }

  if (rarity.includes('holo')) {
    return 'rare holo';
  }

  if (rarity.includes('ultra') || rarity.includes('illustration') || rarity.includes('full art')) {
    return 'rare ultra';
  }

  if (BASIC_RARITIES.has(rarity)) {
    return rarity;
  }

  return rarity || 'common';
}

export function isTrainerGalleryCard(card: TCGCard): boolean {
  const localNumber = String(card.localId ?? card.number ?? '');
  const setId = card.set?.id ?? card.id.split('-')[0] ?? '';

  return /^(tg|gg)/i.test(localNumber) || /tg$/i.test(setId);
}

function getSupertypeAttribute(category: TCGCardCategory | undefined): string {
  switch (category) {
    case 'Trainer':
      return 'trainer';
    case 'Energy':
      return 'energy';
    default:
      return 'pokémon';
  }
}

function getSubtypeAttribute(card: TCGCard): string {
  const subtypes = new Set<string>();
  const searchable = normalizeText([card.stage, card.suffix, card.name, card.rarity].filter(Boolean).join(' '));

  if (card.category === 'Trainer') {
    if (card.trainerType) subtypes.add(normalizeText(card.trainerType));
  } else if (card.category === 'Energy') {
    if (card.energyType) subtypes.add(normalizeText(card.energyType));
  } else {
    if (card.stage) subtypes.add(formatStageSubtype(card.stage));
    if (hasToken(searchable, 'radiant')) subtypes.add('radiant');
    if (hasToken(searchable, 'vmax')) subtypes.add('vmax');
    else if (hasToken(searchable, 'vstar')) subtypes.add('vstar');
    else if (hasToken(searchable, 'v')) subtypes.add('v');
    if (hasToken(searchable, 'ex')) subtypes.add('ex');
    if (hasToken(searchable, 'gx')) subtypes.add('gx');
  }

  return [...subtypes].filter(Boolean).join(' ') || 'basic';
}

function getTypeClasses(card: TCGCard): string[] {
  return (card.types ?? [])
    .map((type) => normalizeText(type).replace(/\s+/g, '-'))
    .filter(Boolean);
}

function getArtWindow(card: TCGCard): string {
  if (card.category === 'Energy') return 'energy';
  if (card.category === 'Trainer') return 'trainer';

  const setId = (card.set?.id ?? card.id.split('-')[0] ?? '').toLowerCase();

  if (/^(base|gym|neo|ecard)/.test(setId)) return 'pokemon-wotc';
  if (/^(ex|np|pop)/.test(setId) || setId.startsWith('tk-ex')) return 'pokemon-ex';
  if (/^(dp|dpp|pl|hgss|hgssp|col)/.test(setId) || setId.startsWith('tk-dp') || setId.startsWith('tk-hs')) return 'pokemon-dp-hgss';
  if (/^(bw|bwp|dv|rc|201[1-3]bw)/.test(setId) || setId.startsWith('tk-bw')) return 'pokemon-bw';

  return 'pokemon-modern';
}

function formatStageSubtype(stage: string): string {
  const normalized = normalizeText(stage);

  if (normalized === 'stage1') return 'stage 1';
  if (normalized === 'stage2') return 'stage 2';
  if (normalized === 'levelx') return 'level x';

  return normalized;
}

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasToken(value: string, token: string): boolean {
  return new RegExp(`(^|\\s)${token}(?=\\s|$)`).test(value);
}
