function normalizeRarityText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const CANONICAL_RARITY_KEYS: Record<string, string> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  doublerare: 'doublerare',
  ultrarare: 'ultrarare',
  illustrationrare: 'illustrationrare',
  specialillustrationrare: 'specialillustrationrare',
  illustrationspecialerare: 'specialillustrationrare',
  hyperrare: 'hyperrare',
  secretrare: 'secretrare',
  promo: 'promo',
  trainergallery: 'trainergallery',
  amazingrare: 'amazingrare',
  radiantrare: 'radiantrare',
  rareholo: 'rareholo',
  rarehologx: 'rarehologx',
  rareholov: 'rareholov',
  rareholovmax: 'rareholovmax',
  rareholovstar: 'rareholovstar',
  rarerainbow: 'rarerainbow',
  raresecret: 'raresecret',
  reverseholo: 'reverseholo',
};

export function getCanonicalTcgRarity(value?: string | null) {
  const normalized = normalizeRarityText(value ?? '');

  if (!normalized) {
    return '';
  }

  return CANONICAL_RARITY_KEYS[normalized] ?? normalized;
}

export function isSameTcgRarity(left?: string | null, right?: string | null) {
  const leftKey = getCanonicalTcgRarity(left);
  const rightKey = getCanonicalTcgRarity(right);

  return leftKey.length > 0 && leftKey === rightKey;
}
