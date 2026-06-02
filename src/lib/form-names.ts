import { isSupportedLanguage, type SupportedLanguage } from './languages';

type FormRule = {
  readonly test: (normalizedName: string) => boolean;
  readonly format: (baseLocalizedName: string, lang: SupportedLanguage, originalName: string) => string;
};

type LanguageSuffixMap = Readonly<Record<SupportedLanguage, string>>;

const supportedLanguage = (lang: string): SupportedLanguage =>
  isSupportedLanguage(lang) ? lang : 'en';

const normalizedName = (name: string): string => name.toLowerCase().replace(/--+/g, '-');

const FORM_BASE_SUFFIXES = [
  'mega-x',
  'mega-y',
  'gigantamax',
  'gmax',
  'primal',
  'ultra',
  'original-cap',
  'hoenn-cap',
  'sinnoh-cap',
  'unova-cap',
  'kalos-cap',
  'alola-cap',
  'partner-cap',
  'world-cap',
  'rock-star',
  'pop-star',
  'cosplay',
  'belle',
  'phd',
  'libre',
  'starter',
  'alola',
  'galar',
  'hisui',
  'paldea',
  'therian',
  'origin',
  'sky',
  'school',
  'ash',
  'hero',
  'complete',
  'terastal',
  'stellar',
  'pirouette',
  'unbound',
  'confined',
  'ice',
  'shadow',
  'plant',
  'sandy',
  'trash',
  'sun',
  'moon',
  'stand',
  'believe',
  'await',
  'grow',
  'protag',
  'legend',
  'world',
  'baile',
  'pompom',
  'pawget',
  'bravel',
  'dusk',
  'dawn',
  'midnight',
  'erosion',
  'valiant',
  'blade',
] as const;

const FORM_BASE_SUFFIXES_SORTED = [...FORM_BASE_SUFFIXES].sort((a, b) => b.length - a.length);

export function getBaseSpeciesName(name: string): string {
  const normalized = normalizedName(name);

  for (const suffix of FORM_BASE_SUFFIXES_SORTED) {
    const token = `-${suffix}`;
    if (normalized === suffix || normalized.endsWith(token) || normalized.includes(`${token}-`)) {
      return normalized.replace(new RegExp(`${token}(-.*)?$`), '');
    }
  }

  return normalized;
}

const localizedSuffix = (
  en: string,
  fr = en,
  es = en,
  de = en,
  it = en,
  ja = en,
  ko = en,
  zh = en,
  pt = en,
): LanguageSuffixMap => ({
  en,
  fr,
  es,
  de,
  it,
  ja,
  ko,
  zh,
  pt,
});

const appendSuffixOnce = (baseLocalizedName: string, suffix: string): string => {
  const normalizedBase = normalizedName(baseLocalizedName);
  const normalizedSuffix = normalizedName(suffix);
  if (normalizedBase.endsWith(`-${normalizedSuffix}`) || normalizedBase === normalizedSuffix) {
    return baseLocalizedName;
  }
  return `${baseLocalizedName}-${suffix}`;
};

const suffixRule = (
  matches: readonly string[],
  suffixes: LanguageSuffixMap,
): FormRule => ({
  test: (value) => matches.some((match) => value.includes(match)),
  format: (baseLocalizedName, lang) => `${baseLocalizedName}-${suffixes[lang]}`,
});

const directRule = (
  matches: readonly string[],
  format: (baseLocalizedName: string, lang: SupportedLanguage, originalName: string) => string,
): FormRule => ({
  test: (value) => matches.some((match) => value.includes(match)),
  format,
});

const FORM_RULES: readonly FormRule[] = [
  directRule(['-gmax', '-gigantamax'], (baseLocalizedName, lang) => {
    const cleanBase = baseLocalizedName.split('-')[0];
    return cleanBase + (lang === 'fr' ? '-Gigantamax' : '-G-Max');
  }),
  directRule(['-original-cap'], (baseLocalizedName) => `${baseLocalizedName}-Original Cap`),
  directRule(['-hoenn-cap'], (baseLocalizedName) => `${baseLocalizedName}-Hoenn Cap`),
  directRule(['-sinnoh-cap'], (baseLocalizedName) => `${baseLocalizedName}-Sinnoh Cap`),
  directRule(['-unova-cap'], (baseLocalizedName) => `${baseLocalizedName}-Unova Cap`),
  directRule(['-kalos-cap'], (baseLocalizedName) => `${baseLocalizedName}-Kalos Cap`),
  directRule(['-alola-cap'], (baseLocalizedName) => `${baseLocalizedName}-Alola Cap`),
  directRule(['-partner-cap'], (baseLocalizedName) => `${baseLocalizedName}-Partner Cap`),
  directRule(['-world-cap'], (baseLocalizedName) => `${baseLocalizedName}-World Cap`),
  directRule(['-belle'], (baseLocalizedName) => `${baseLocalizedName}-Belle`),
  directRule(['-phd'], (baseLocalizedName) => `${baseLocalizedName}-PhD`),
  directRule(['-libre'], (baseLocalizedName) => appendSuffixOnce(baseLocalizedName, 'Libre')),
  directRule(['-rock-star'], (baseLocalizedName) => `${baseLocalizedName}-Rock Star`),
  directRule(['-pop-star'], (baseLocalizedName) => `${baseLocalizedName}-Pop Star`),
  directRule(['-mega-x'], (baseLocalizedName, lang) => `${baseLocalizedName}-${lang === 'fr' ? 'Méga X' : 'Mega X'}`),
  directRule(['-mega-y'], (baseLocalizedName, lang) => `${baseLocalizedName}-${lang === 'fr' ? 'Méga Y' : 'Mega Y'}`),
  directRule(['-mega'], (baseLocalizedName, lang) => `${baseLocalizedName}-${lang === 'fr' ? 'Méga' : 'Mega'}`),
  directRule(['-primal'], (baseLocalizedName, lang) => `${baseLocalizedName}-${lang === 'fr' ? 'Primo' : 'Primal'}`),
  directRule(['-ultra'], (baseLocalizedName, lang) => `${lang === 'fr' ? `${baseLocalizedName}-Ultra` : `Ultra-${baseLocalizedName}`}`),
  suffixRule(['-alola'], localizedSuffix('Alola', "d'Alola", 'de Alola', 'Alola', 'di Alola', 'アローラ', '알로라', '阿罗拉')),
  suffixRule(['-galar'], localizedSuffix('Galar', 'de Galar', 'de Galar', 'Galar', 'di Galar', 'ガラル', '가라르', '伽勒尔')),
  suffixRule(['-hisui'], localizedSuffix('Hisui', 'de Hisui', 'de Hisui', 'Hisui', 'di Hisui', 'Hisui', '히스이', '洗翠')),
  suffixRule(['-paldea'], localizedSuffix('Paldea', 'de Paldea', 'de Paldea', 'Paldea', 'di Paldea', 'パルデア', '팔데아', '帕底亚')),
  suffixRule(['-therian'], localizedSuffix('Therian', 'Forme Totémique', 'Forma Totémica', 'Tiergeist', 'Forma Totem', 'Therian', 'Therian')),
  suffixRule(['-origin'], localizedSuffix('Origin', 'Origin', 'Origen', 'Origin', 'Origine', 'Origin', 'Origin', '起源')),
  suffixRule(['-sky'], localizedSuffix('Sky', 'Ciel', 'Cielo', 'Himmel', 'Cielo', 'Sky', 'Sky', '天空')),
  suffixRule(['-plant'], localizedSuffix('Plant', 'Plante', 'Planta', 'Pflanze', 'Pianta', 'Plant', 'Plant')),
  suffixRule(['-sandy'], localizedSuffix('Sandy', 'Sable', 'Arena', 'Sand', 'Sabbia', 'Sandy', 'Sandy')),
  suffixRule(['-trash'], localizedSuffix('Trash', 'Déchet', 'Basura', 'Müll', 'Rifiuti', 'Trash', 'Trash')),
  suffixRule(['-sun'], localizedSuffix('Sun', 'Soleil', 'Sol', 'Sonne', 'Sole', 'Sun', 'Sun')),
  suffixRule(['-moon'], localizedSuffix('Moon', 'Lune', 'Luna', 'Mond', 'Luna', 'Moon', 'Moon')),
  suffixRule(['-school'], localizedSuffix('School', 'Banc', 'Banco', 'Schwarm', 'Banco', 'School', 'School')),
  suffixRule(['-perfect'], localizedSuffix('Perfect', 'Parfait', 'Perfecto', 'Perfekt', 'Perfetto', 'Perfect', 'Perfect')),
  suffixRule(['-blade'], localizedSuffix('Blade', 'Lame', 'Espada', 'Klinge', 'Lama', 'Blade', 'Blade')),
  suffixRule(['-dusk', '-dusk-mane'], localizedSuffix('Dusk', 'Crépuscule', 'Crepúsculo', 'Dämmer', 'Crepuscolo', 'Dusk', 'Dusk')),
  suffixRule(['-dawn', '-dawn-mane'], localizedSuffix('Dawn', 'Aube', 'Aurora', 'Morgen', 'Alba', 'Dawn', 'Dawn')),
  suffixRule(['-midnight'], localizedSuffix('Midnight', 'Minuit', 'Medianoche', 'Mitternacht', 'Mezzanotte', 'Midnight', 'Midnight')),
  suffixRule(['-complete'], localizedSuffix('Complete', 'Complet', 'Completo', 'Vollständig', 'Completo', 'Complete', 'Complete')),
  suffixRule(['-erosion'], localizedSuffix('Erosion', 'Érosion', 'Erosión', 'Erosion', 'Erosione', 'Erosion', 'Erosion')),
  suffixRule(['-valiant'], localizedSuffix('Valiant', 'Vaillant', 'Valiente', 'Tapfer', 'Coraggioso', 'Valiant', 'Valiant')),
  suffixRule(['-terastal'], localizedSuffix('Terastal', 'Térastal', 'Térastar', 'Terapagos', 'Terastal', 'テラスタル', '테라스탈')),
  suffixRule(['-stellar'], localizedSuffix('Stellar', 'Stellaire', 'Estelar', 'Stellar', 'Stellare', 'Stellar', 'Stellar')),
  suffixRule(['-ice'], localizedSuffix('Ice', 'Glace', 'Hielo', 'Eis', 'Ghiaccio', 'Ice', 'Ice')),
  suffixRule(['-shadow'], localizedSuffix('Shadow', 'Ombre', 'Sombra', 'Schatten', 'Ombra', 'Shadow', 'Shadow')),
  suffixRule(['-fighting'], localizedSuffix('Fighting', 'Combat', 'Lucha', 'Kampf', 'Lotta', 'Fighting', 'Fighting')),
  suffixRule(['-poison'], localizedSuffix('Poison', 'Poison', 'Veneno', 'Gift', 'Veleno', 'Poison', 'Poison')),
  suffixRule(['-ground'], localizedSuffix('Ground', 'Sol', 'Tierra', 'Boden', 'Terra', 'Ground', 'Ground')),
  suffixRule(['-flying'], localizedSuffix('Flying', 'Vol', 'Volador', 'Flug', 'Volante', 'Flying', 'Flying')),
  suffixRule(['-psychic'], localizedSuffix('Psychic', 'Psychique', 'Psíquico', 'Psycho', 'Psico', 'Psychic', 'Psychic')),
  suffixRule(['-bug'], localizedSuffix('Bug', 'Insecte', 'Bicho', 'Käfer', 'Coleottero', 'Bug', 'Bug')),
  suffixRule(['-rock'], localizedSuffix('Rock', 'Roche', 'Roca', 'Gestein', 'Roccia', 'Rock', 'Rock')),
  suffixRule(['-ghost'], localizedSuffix('Ghost', 'Spectre', 'Fantasma', 'Geist', 'Spettro', 'Ghost', 'Ghost')),
  suffixRule(['-dragon'], localizedSuffix('Dragon', 'Dragon', 'Dragón', 'Drache', 'Drago', 'Dragon', 'Dragon')),
  suffixRule(['-dark'], localizedSuffix('Dark', 'Ténèbres', 'Siniestro', 'Unlicht', 'Buio', 'Dark', 'Dark')),
  suffixRule(['-steel'], localizedSuffix('Steel', 'Acier', 'Acero', 'Stahl', 'Acciaio', 'Steel', 'Steel')),
  suffixRule(['-fairy'], localizedSuffix('Fairy', 'Fée', 'Hada', 'Fee', 'Fata', 'Fairy', 'Fairy')),
  suffixRule(['-normal'], localizedSuffix('Normal', 'Normal', 'Normal', 'Normal', 'Normale', 'Normal', 'Normal')),
  suffixRule(['-fire'], localizedSuffix('Fire', 'Feu', 'Fuego', 'Feuer', 'Fuoco', 'Fire', 'Fire')),
  suffixRule(['-water'], localizedSuffix('Water', 'Eau', 'Agua', 'Wasser', 'Acqua', 'Water', 'Water')),
  suffixRule(['-electric'], localizedSuffix('Electric', 'Électrique', 'Eléctrico', 'Elektro', 'Elettro', 'Electric', 'Electric')),
  suffixRule(['-grass'], localizedSuffix('Grass', 'Plante', 'Planta', 'Pflanze', 'Erba', 'Grass', 'Grass')),
  suffixRule(['-male'], localizedSuffix('Male', 'Mâle', 'Macho', 'Männlich', 'Maschio', 'Male', 'Male')),
  suffixRule(['-female'], localizedSuffix('Female', 'Femelle', 'Hembra', 'Weiblich', 'Femmina', 'Female', 'Female')),
  suffixRule(['-ash'], localizedSuffix('Ash', 'Sacha', 'Ash', 'Ash', 'Ash', 'Ash', 'Ash', '小智')),
  suffixRule(['-hero'], localizedSuffix('Hero', 'Héros', 'Héroe', 'Held', 'Eroe', 'Hero', 'Hero', '英雄')),
  suffixRule(['-winter'], localizedSuffix('Winter', 'Hiver', 'Invierno', 'Winter', 'Inverno', 'Winter', 'Winter', '冬天')),
  suffixRule(['-summer'], localizedSuffix('Summer', 'Été', 'Verano', 'Sommer', 'Estate', 'Summer', 'Summer', '夏天')),
  suffixRule(['-spring'], localizedSuffix('Spring', 'Printemps', 'Primavera', 'Frühling', 'Primavera', 'Spring', 'Spring', '春天')),
  suffixRule(['-autumn'], localizedSuffix('Autumn', 'Automne', 'Otoño', 'Herbst', 'Autunno', 'Autumn', 'Autumn', '秋天')),
  suffixRule(['-cosplay'], localizedSuffix('Cosplay', 'Cosplay', 'Cosplay', 'Cosplay', 'Cosplay', 'Cosplay', 'Cosplay', '换装')),
  suffixRule(['-pop-star'], localizedSuffix('Pop Star', 'Idole', 'Estrella', 'Star', 'Star', 'ポップスター', '팝스타')),
  suffixRule(['-rock-star'], localizedSuffix('Rock Star', 'Rockstar', 'Rockstar', 'Rockstar', 'Rockstar', 'ロックスター', '록스타')),
  suffixRule(['-partner'], localizedSuffix('Partner', 'Partenaire', 'Compañero', 'Partner', 'Partner', 'Partner', 'Partner')),
  suffixRule(['-original'], localizedSuffix('Original', 'Original', 'Original', 'Original', 'Originale', 'Original', 'Original')),
  suffixRule(['-starter'], localizedSuffix('Starter', 'Débutant', 'Inicial', 'Starter', 'Iniziale', 'Starter', 'Starter')),
  suffixRule(['-libero'], localizedSuffix('Libero', 'Libero', 'Libero', 'Libero', 'Libero', 'Libero', 'Libero')),
  suffixRule(['-confined'], localizedSuffix('Confined', 'Confiné', 'Confinado', 'Gefangen', 'Confinato', 'Confined', 'Confined')),
  suffixRule(['-unbound'], localizedSuffix('Unbound', 'Délivré', 'Libre', 'Entfesselt', 'Libero', 'Unbound', 'Unbound')),
  directRule(['-s'], (baseLocalizedName) => `${baseLocalizedName}-S`),
  directRule(['-c'], (baseLocalizedName) => `${baseLocalizedName}-C`),
  directRule(['-b'], (baseLocalizedName) => `${baseLocalizedName}-B`),
  directRule(['-d'], (baseLocalizedName) => `${baseLocalizedName}-D`),
  directRule(['-e'], (baseLocalizedName) => `${baseLocalizedName}-E`),
  directRule(['-l'], (baseLocalizedName) => `${baseLocalizedName}-L`),
  directRule(['-m'], (baseLocalizedName) => `${baseLocalizedName}-M`),
  directRule(['-n'], (baseLocalizedName) => `${baseLocalizedName}-N`),
  directRule(['-p'], (baseLocalizedName) => `${baseLocalizedName}-P`),
  directRule(['-r'], (baseLocalizedName) => `${baseLocalizedName}-R`),
  directRule(['-t'], (baseLocalizedName) => `${baseLocalizedName}-T`),
  directRule(['-u'], (baseLocalizedName) => `${baseLocalizedName}-U`),
  directRule(['-v'], (baseLocalizedName) => `${baseLocalizedName}-V`),
  directRule(['-w'], (baseLocalizedName) => `${baseLocalizedName}-W`),
  directRule(['-x'], (baseLocalizedName) => `${baseLocalizedName}-X`),
  directRule(['-y'], (baseLocalizedName) => `${baseLocalizedName}-Y`),
];

export function getFormDisplayName(name: string, baseLocalizedName: string, lang: string): string {
  const resolvedLang = supportedLanguage(lang);
  const normalized = normalizedName(name);

  for (const rule of FORM_RULES) {
    if (rule.test(normalized)) {
      return rule.format(baseLocalizedName, resolvedLang, name);
    }
  }

  return baseLocalizedName;
}
