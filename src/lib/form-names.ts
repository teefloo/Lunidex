import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';

export interface PokemonFormData {
  name: string;
  form_name?: string;
  form_names?: Array<{
    name: string;
    language: { name: string };
  }>;
  names?: Array<{
    name: string;
    language: { name: string };
  }>;
}

export interface PokemonDisplayNameOptions {
  /** The stable PokéAPI slug, for example `charizard-mega-x`. */
  name: string;
  /** The localized species name, for example `Dracaufeu`. */
  baseLocalizedName: string;
  /** The application language used for the form label. */
  lang: string;
  /** Prefer the species relation from `/pokemon/{name}` when available. */
  baseSpeciesName?: string;
  /** Optional `/pokemon-form/{name}` response with official localized labels. */
  form?: PokemonFormData | null;
}

type LanguageLabelMap = Readonly<Record<SupportedLanguage, string>>;

const resolvedLanguage = (lang: string): SupportedLanguage =>
  isSupportedLanguage(lang) ? lang : 'en';

const normalizeSlug = (value: string): string =>
  value.trim().toLowerCase().replace(/_/g, '-').replace(/--+/g, '-');

const languageLabel = (
  en: string,
  fr = en,
  es = en,
  de = en,
  it = en,
  ja = en,
  ko = en,
  zh = en,
): LanguageLabelMap => ({ en, fr, es, de, it, ja, ko, zh });

/**
 * Form markers known to PokéAPI. This list is used only to recover the base
 * species when a caller has not already received `pokemon.species.name`.
 * It is intentionally ordered longest-first so `mega-x` wins over `mega`.
 */
const FORM_MARKERS = [
  'mega-x', 'mega-y', 'mega', 'gigantamax', 'gmax', 'primal',
  'original-cap', 'hoenn-cap', 'sinnoh-cap', 'unova-cap', 'kalos-cap',
  'alola-cap', 'partner-cap', 'world-cap', 'rock-star', 'pop-star',
  'rapid-strike', 'single-strike', 'ice-rider', 'shadow-rider',
  'family-of-three', 'family-of-four', 'three-segment', 'two-segment',
  'wellspring-mask', 'hearthflame-mask', 'cornerstone-mask', 'teal-mask',
  '10-power-construct', '50-power-construct', '10-percent', '50-percent',
  'vanilla-cream', 'ruby-cream', 'matcha-cream', 'mint-cream',
  'lemon-cream', 'salted-cream', 'ruby-swirl', 'caramel-swirl',
  'rainbow-swirl', 'red-meteor', 'orange-meteor', 'yellow-meteor',
  'green-meteor', 'blue-meteor', 'indigo-meteor', 'violet-meteor',
  'icy-snow', 'polar', 'tundra', 'continental', 'garden', 'elegant',
  'meadow', 'modern', 'marine', 'archipelago', 'high-plains', 'sandstorm',
  'river', 'monsoon', 'savanna', 'sun', 'ocean', 'jungle', 'fancy', 'pokeball',
  'alola', 'galar', 'hisui', 'paldea', 'crowned', 'therian', 'incarnate',
  'origin', 'altered', 'resolute', 'pirouette', 'sky', 'land', 'black', 'white',
  'hero', 'ash', 'school', 'solo', 'busted', 'disguised', 'dusk', 'dawn',
  'midnight', 'midday', 'blade', 'shield', 'complete', 'ultra', 'terastal',
  'stellar', 'totem', 'partner', 'starter', 'low-key', 'amped', 'wash', 'heat',
  'frost', 'fan', 'mow', 'plant', 'sandy', 'trash', 'douse', 'shock', 'burn',
  'chill', 'fire', 'water', 'electric', 'grass', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
  'sunny', 'rainy', 'snowy', 'attack', 'defense', 'speed', 'normal', 'red-striped', 'blue-striped',
  'white-striped', 'zen', 'eternal', 'baile', 'pom-pom', 'pau', 'sensu',
  'dusk-mane', 'dawn-wings', 'dawn-mane', 'full-belly', 'hangry', 'small',
  'average', 'large', 'super', 'curly', 'droopy', 'stretchy', 'artisan', 'phony',
  'antique', 'noice', 'female', 'male', 'east-sea', 'west-sea', 'star', 'heart',
  'diamond', 'debutante', 'matron', 'dandy', 'pharaoh', 'libre', 'belle', 'phd',
  'cosplay', 'confined', 'unbound', 'apex-build', 'ultimate-mode', 'low-power',
  'no-form', 'combat', 'blaze', 'aqua', 'roaming', 'zero', 'ten-percent',
] as const;

const FORM_MARKERS_SORTED = [...new Set(FORM_MARKERS)].sort((a, b) => b.length - a.length);

/**
 * Find the stable base species slug without treating one-letter form suffixes
 * as generic rules. In particular, `zacian-crowned` must never become
 * `zacian-c`.
 */
export function getBaseSpeciesName(name: string): string {
  const normalized = normalizeSlug(name);
  if (!normalized) return normalized;

  // Unown's letter forms are the only common one-letter form suffixes that
  // should be inferred without a caller-provided species relation.
  if (/^unown-[a-z]$/.test(normalized)) return 'unown';

  for (const marker of FORM_MARKERS_SORTED) {
    const markerIndex = normalized.indexOf(`-${marker}`);
    if (markerIndex > 0) return normalized.slice(0, markerIndex);
  }

  return normalized;
}

const FORM_LABELS: Readonly<Record<string, LanguageLabelMap>> = {
  mega: languageLabel('Mega', 'Méga', 'Mega', 'Mega', 'Mega', 'メガ', '메가', '超级'),
  'mega-x': languageLabel('Mega X', 'Méga X', 'Mega X', 'Mega X', 'Mega X', 'メガX', '메가X', '超级X'),
  'mega-y': languageLabel('Mega Y', 'Méga Y', 'Mega Y', 'Mega Y', 'Mega Y', 'メガY', '메가Y', '超级Y'),
  primal: languageLabel('Primal', 'Primo', 'Primigenio', 'Proto', 'Primordiale', 'ゲンシ', '원시', '原始'),
  gmax: languageLabel('G-Max', 'Gigamax', 'Gigamax', 'Gigadynamax', 'Gigamax', 'キョダイマックス', '거다이맥스', '超极巨'),
  gigantamax: languageLabel('G-Max', 'Gigamax', 'Gigamax', 'Gigadynamax', 'Gigamax', 'キョダイマックス', '거다이맥스', '超极巨'),
  alola: languageLabel('Alolan Form', "Forme d'Alola", 'Forma de Alola', 'Alola-Form', 'Forma di Alola', 'アローラのすがた', '알로라의 모습', '阿罗拉形态'),
  galar: languageLabel('Galarian Form', 'Forme de Galar', 'Forma de Galar', 'Galar-Form', 'Forma di Galar', 'ガラルのすがた', '가라르의 모습', '伽勒尔形态'),
  hisui: languageLabel('Hisuian Form', 'Forme de Hisui', 'Forma de Hisui', 'Hisui-Form', 'Forma di Hisui', 'ヒスイのすがた', '히스이의 모습', '洗翠形态'),
  paldea: languageLabel('Paldean Form', 'Forme de Paldea', 'Forma de Paldea', 'Paldea-Form', 'Forma di Paldea', 'パルデアのすがた', '팔데아의 모습', '帕底亚形态'),
  crowned: languageLabel('Crowned', 'Couronné', 'Coronado', 'Gekrönt', 'Incornato', '王冠', '왕관', '王冠'),
  origin: languageLabel('Origin Forme', 'Forme Originelle', 'Forma Origen', 'Urform', 'Forma Originale', 'オリジンフォルム', '오리진폼', '起源形态'),
  altered: languageLabel('Altered Forme', 'Forme Alternative', 'Forma Modificada', 'Wandelform', 'Forma Alterata', 'アナザーフォルム', '어나더폼', '别样形态'),
  therian: languageLabel('Therian Forme', 'Forme Totémique', 'Forma Tótem', 'Tiergeistform', 'Forma Totem', 'れいじゅうフォルム', '영물폼', '灵兽形态'),
  incarnate: languageLabel('Incarnate Forme', 'Forme Avatar', 'Forma Avatar', 'Inkarnationsform', 'Forma Incarnazione', 'けしんフォルム', '화신폼', '化身形态'),
  sky: languageLabel('Sky Forme', 'Forme Céleste', 'Forma Cielo', 'Zenitform', 'Forma Cielo', 'スカイフォルム', '스카이폼', '天空形态'),
  land: languageLabel('Land Forme', 'Forme Terrestre', 'Forma Tierra', 'Landform', 'Forma Terra', 'ランドフォルム', '랜드폼', '土地形态'),
  resolute: languageLabel('Resolute Forme', 'Forme Vaillante', 'Forma Brío', 'Resolutform', 'Forma Risoluta', 'かくごのすがた', '각오의 모습', '觉悟形态'),
  pirouette: languageLabel('Pirouette Forme', 'Forme Pirouette', 'Forma Pirueta', 'Pirouettenform', 'Forma Piroetta', 'ステップフォルム', '스텝폼', '舞步形态'),
  black: languageLabel('Black Forme', 'Forme Noire', 'Forma Negra', 'Schwarzform', 'Forma Nera', 'ブラックフォルム', '블랙폼', '黑色形态'),
  white: languageLabel('White Forme', 'Forme Blanche', 'Forma Blanca', 'Weißform', 'Forma Bianca', 'ホワイトフォルム', '화이트폼', '白色形态'),
  hero: languageLabel('Hero Forme', 'Forme Héros', 'Forma Héroe', 'Heldenform', 'Forma Eroe', 'ヒーローフォルム', '히어로폼', '英雄形态'),
  ash: languageLabel('Ash Forme', 'Forme Sacha', 'Forma Ash', 'Ash-Form', 'Forma Ash', 'サトシゲッコウガ', '지우개굴닌자', '小智版'),
  school: languageLabel('School Forme', 'Forme Banc', 'Forma Banco', 'Schwarmform', 'Forma Banco', 'むれたフォルム', '군집폼', '鱼群形态'),
  solo: languageLabel('Solo Forme', 'Forme Individuelle', 'Forma Individual', 'Einzelform', 'Forma Singola', 'たんどくのすがた', '단독의 모습', '单独形态'),
  busted: languageLabel('Busted Forme', 'Forme Démasquée', 'Forma Descubierta', 'Entlarvte Form', 'Forma Smascherata', 'ばれたすがた', '들킨 모습', '破破形态'),
  disguised: languageLabel('Disguised Forme', 'Forme Déguisée', 'Forma Disfrazada', 'Verkleidete Form', 'Forma Travestita', 'ばけたすがた', '탈을 쓴 모습', '伪装形态'),
  dusk: languageLabel('Dusk Forme', 'Forme Crépusculaire', 'Forma Crepuscular', 'Zwielichtform', 'Forma Crepuscolo', 'たそがれのすがた', '황혼의 모습', '黄昏形态'),
  dawn: languageLabel('Dawn Forme', 'Forme Aube', 'Forma Alba', 'Morgenform', 'Forma Alba', 'あかつきのすがた', '새벽의 모습', '拂晓形态'),
  midnight: languageLabel('Midnight Forme', 'Forme Nocturne', 'Forma Nocturna', 'Mitternachtsform', 'Forma Notte', 'まよなかのすがた', '한밤중의 모습', '黑夜形态'),
  midday: languageLabel('Midday Forme', 'Forme Diurne', 'Forma Diurna', 'Mittagsform', 'Forma Giorno', 'まひるのすがた', '한낮의 모습', '白昼形态'),
  blade: languageLabel('Blade Forme', 'Forme Lame', 'Forma Filo', 'Klingenform', 'Forma Spada', 'ブレードフォルム', '블레이드폼', '刀剑形态'),
  shield: languageLabel('Shield Forme', 'Forme Bouclier', 'Forma Escudo', 'Schildform', 'Forma Scudo', 'シールドフォルム', '실드폼', '盾牌形态'),
  complete: languageLabel('Complete Forme', 'Forme Complète', 'Forma Completa', 'Komplettform', 'Forma Completa', 'パーフェクトフォルム', '퍼펙트폼', '完全形态'),
  ultra: languageLabel('Ultra', 'Ultra', 'Ultra', 'Ultra', 'Ultra', 'ウルトラ', '울트라', '究极'),
  terastal: languageLabel('Terastal Form', 'Forme Téracristal', 'Forma Teracristal', 'Teraform', 'Forma Teracristal', 'テラスタルフォルム', '테라스탈폼', '太晶形态'),
  stellar: languageLabel('Stellar Form', 'Forme Stellaire', 'Forma Estelar', 'Stellarform', 'Forma Astrale', 'ステラフォルム', '스텔라폼', '星晶形态'),
  totem: languageLabel('Totem', 'Dominant', 'Dominante', 'Herrscher', 'Dominante', 'ぬし', '주인', '霸主'),
  partner: languageLabel('Partner', 'Partenaire', 'Compañero', 'Partner', 'Compagno', '相棒', '파트너', '搭档'),
  starter: languageLabel('Starter', 'Partenaire de départ', 'Inicial', 'Starter', 'Iniziale', 'サトシの', '스타터', '初始'),
  'rapid-strike': languageLabel('Rapid Strike Style', 'Style Mille Poings', 'Estilo Fluido', 'Fließender Stil', 'Stile Mille Onde', 'れんげきのかた', '연격의 태세', '连击流派'),
  'single-strike': languageLabel('Single Strike Style', 'Style Poing Final', 'Estilo Brusco', 'Fokussierter Stil', 'Stile Pluripugno', 'いちげきのかた', '일격의 태세', '一击流派'),
  'low-key': languageLabel('Low Key Form', 'Forme Grave', 'Forma Grave', 'Low-Key-Form', 'Forma Basso Profilo', 'ローなすがた', '로우한 모습', '低调形态'),
  amped: languageLabel('Amped Form', 'Forme Aigüe', 'Forma Aguda', 'Hoch-Form', 'Forma Melodia', 'ハイなすがた', '하이한 모습', '高调形态'),
  wash: languageLabel('Wash', 'Lavage', 'Lavado', 'Wasch', 'Lavaggio', 'ウォッシュ', '워시', '清洗'),
  heat: languageLabel('Heat', 'Chaleur', 'Calor', 'Hitze', 'Calore', 'ヒート', '히트', '加热'),
  frost: languageLabel('Frost', 'Froid', 'Frío', 'Frost', 'Gelo', 'フロスト', '프로스트', '结霜'),
  fan: languageLabel('Fan', 'Hélice', 'Ventilador', 'Wirbel', 'Ventola', 'スピン', '스핀', '旋转'),
  mow: languageLabel('Mow', 'Tonte', 'Corte', 'Rasen', 'Taglio', 'カット', '커트', '切割'),
  plant: languageLabel('Plant', 'Plante', 'Planta', 'Pflanze', 'Pianta', 'くさきのすがた', '초목의 모습', '植物形态'),
  sandy: languageLabel('Sandy', 'Sable', 'Arena', 'Sand', 'Sabbia', 'すなちのすがた', '모래의 모습', '沙土形态'),
  trash: languageLabel('Trash', 'Déchet', 'Basura', 'Müll', 'Rifiuti', 'ゴミのすがた', '쓰레기의 모습', '垃圾形态'),
  douse: languageLabel('Douse', 'Eau', 'Agua', 'Wasser', 'Acqua', 'アクア', '아쿠아', '水'),
  shock: languageLabel('Shock', 'Électrique', 'Eléctrico', 'Elektro', 'Tuono', 'ショック', '쇼크', '电击'),
  burn: languageLabel('Burn', 'Feu', 'Fuego', 'Feuer', 'Fuoco', 'ブレイズ', '블레이즈', '燃烧'),
  chill: languageLabel('Chill', 'Glace', 'Hielo', 'Eis', 'Gelo', 'フリーズ', '프리즈', '冰冻'),
  attack: languageLabel('Attack Forme', 'Forme Attaque', 'Forma Ataque', 'Angriffsform', 'Forma Attacco', 'アタックフォルム', '어택폼', '攻击形态'),
  defense: languageLabel('Defense Forme', 'Forme Défense', 'Forma Defensa', 'Verteidigungsform', 'Forma Difesa', 'ディフェンスフォルム', '디펜스폼', '防御形态'),
  speed: languageLabel('Speed Forme', 'Forme Vitesse', 'Forma Velocidad', 'Initiativform', 'Forma Velocità', 'スピードフォルム', '스피드폼', '速度形态'),
  normal: languageLabel('Normal Forme', 'Forme Normale', 'Forma Normal', 'Normalform', 'Forma Normale', 'ノーマルフォルム', '노말폼', '普通形态'),
  'full-belly': languageLabel('Full Belly', 'Ventre Plein', 'Barriga Llena', 'Satter Bauch', 'Pancia Piena', 'まんぷくもよう', '배부른 모습', '饱腹花纹'),
  hangry: languageLabel('Hangry', 'Affamé', 'Famélico', 'Heißhunger', 'Affamato', 'はらぺこもよう', '배고픈 모습', '空腹花纹'),
  'apex-build': languageLabel('Apex Build', 'Mode Ultime', 'Forma Cumbre', 'Apex-Form', 'Forma Apex', 'マスターモード', '에이펙스 빌드', '巅峰形态'),
  'ultimate-mode': languageLabel('Ultimate Mode', 'Mode Ultime', 'Modo Definitivo', 'Ultimativmodus', 'Modalità Ultima', 'アルティメットモード', '얼티밋 모드', '究极模式'),
  'low-power': languageLabel('Low-Power Mode', 'Mode Faible Puissance', 'Modo de Baja Potencia', 'Schwachstrommodus', 'Modalità Bassa Potenza', 'ローパワーモード', '로 파워 모드', '低功率模式'),
};

const humanizeToken = (token: string): string => token
  .split('-')
  .filter(Boolean)
  .map((part) => {
    if (/^\d+$/.test(part)) return part;
    return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
  })
  .join(' ')
  .replace(/\bGmax\b/gi, 'G-Max')
  .replace(/\bGigantamax\b/gi, 'G-Max');

const toComparisonWords = (value: string): string[] => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .split(/[^a-z0-9%]+/)
  .filter(Boolean);

function removeBaseFromFormLabel(label: string, baseLocalizedName: string): string {
  const labelWords = label.trim().split(/[\s-]+/).filter(Boolean);
  const baseWords = toComparisonWords(baseLocalizedName);
  if (labelWords.length === 0 || baseWords.length === 0) return label.trim();

  const normalizedLabelWords = labelWords.map((word) => toComparisonWords(word).join(''));
  const normalizedBaseWords = baseWords.join('');
  const start = normalizedLabelWords.findIndex((_, index) =>
    normalizedLabelWords.slice(index, index + baseWords.length).join('') === normalizedBaseWords,
  );

  if (start === -1) return label.trim();
  return labelWords.slice(0, start).concat(labelWords.slice(start + baseWords.length)).join(' ').trim();
}

function getFormMarker(name: string, baseSpeciesName?: string): string | null {
  const normalized = normalizeSlug(name);
  const base = normalizeSlug(baseSpeciesName || getBaseSpeciesName(normalized));
  if (!normalized || !base || normalized === base) return null;

  const suffix = normalized.startsWith(`${base}-`) ? normalized.slice(base.length + 1) : normalized;
  return FORM_MARKERS_SORTED.find((marker) => suffix === marker || suffix.startsWith(`${marker}-`))
    || (suffix ? suffix : null);
}

function findLocalizedFormLabel(
  entries: PokemonFormData['form_names'] | PokemonFormData['names'] | undefined,
  lang: SupportedLanguage,
): { value: string; language: string } | null {
  if (!entries?.length) return null;
  const candidates = lang === 'zh' ? ['zh-hans', 'zh', 'en'] : [lang, 'en'];

  for (const candidate of candidates) {
    const entry = entries.find((item) => item.language.name.toLowerCase() === candidate.toLowerCase());
    if (entry?.name?.trim()) return { value: entry.name.trim(), language: candidate };
  }
  return null;
}

function humanizeBaseName(value: string, baseSpeciesName: string): string {
  const trimmed = value.trim();
  if (!trimmed || normalizeSlug(trimmed) === normalizeSlug(baseSpeciesName)) {
    return humanizeToken(baseSpeciesName);
  }
  return trimmed;
}

function getFormLabel(
  token: string,
  lang: SupportedLanguage,
  baseLocalizedName: string,
  form?: PokemonFormData | null,
): string {
  const normalizedToken = normalizeSlug(token);
  const normalizedBase = normalizeSlug(baseLocalizedName);
  if (normalizedToken === 'crowned' && normalizedBase === 'zacian') {
    return languageLabel('Crowned Sword', 'Épée Suprême', 'Espada Suprema', 'Kronenschwert', 'Spada Suprema', 'けんのおう', '검왕', '剑之王')[lang];
  }
  if (normalizedToken === 'crowned' && normalizedBase === 'zamazenta') {
    return languageLabel('Crowned Shield', 'Bouclier Suprême', 'Escudo Supremo', 'Kronenschild', 'Scudo Suprema', 'たてのおう', '방패왕', '盾之王')[lang];
  }
  const labels = FORM_LABELS[normalizedToken];
  const mappedLabel = labels?.[lang];
  const localizedFormLabel = findLocalizedFormLabel(form?.form_names, lang);
  const apiSuffix = localizedFormLabel
    ? removeBaseFromFormLabel(localizedFormLabel.value, baseLocalizedName)
    : '';

  // API form_names contain species names for some forms (for example
  // `Mega Pyroar`) and form-only labels for others (`Crowned Sword`). Use the
  // localized API suffix when it matches the requested locale, while keeping
  // the deterministic mapping when the API only supplied English.
  if (apiSuffix && (localizedFormLabel?.language.toLowerCase() === lang.toLowerCase() || !mappedLabel)) {
    return apiSuffix;
  }
  if (mappedLabel) return mappedLabel;
  if (apiSuffix) return apiSuffix;

  const officialName = findLocalizedFormLabel(form?.names, lang);
  const officialSuffix = officialName ? removeBaseFromFormLabel(officialName.value, baseLocalizedName) : '';
  return officialSuffix || humanizeToken(normalizedToken);
}

/**
 * Produce the one public display name used by metadata, cards, breadcrumbs,
 * search and detail pages. The slug remains an identifier; it is never used
 * as the visible name when a species or form label is available.
 */
export function getPokemonDisplayName({
  name,
  baseLocalizedName,
  lang,
  baseSpeciesName,
  form,
}: PokemonDisplayNameOptions): string {
  const resolvedLang = resolvedLanguage(lang);
  const baseName = normalizeSlug(baseSpeciesName || getBaseSpeciesName(name));
  const baseDisplayName = humanizeBaseName(baseLocalizedName, baseName);
  const token = normalizeSlug(form?.form_name || getFormMarker(name, baseName) || '');

  if (!token || (token === 'normal' && normalizeSlug(name) === baseName)) return baseDisplayName;

  const label = getFormLabel(token, resolvedLang, baseDisplayName, form);
  if (!label || normalizeSlug(label) === normalizeSlug(baseDisplayName)) return baseDisplayName;

  return `${baseDisplayName} ${label}`.replace(/\s+/g, ' ').trim();
}

/** Backwards-compatible adapter for existing UI call sites. */
export function getFormDisplayName(
  name: string,
  baseLocalizedName: string,
  lang: string,
  form?: PokemonFormData | null,
): string {
  return getPokemonDisplayName({ name, baseLocalizedName, lang, form });
}
