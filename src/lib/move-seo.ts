import type { MoveDetail } from '@/types/move';

const POKEAPI_LANGUAGE_BY_LOCALE: Record<string, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  de: 'de',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh-Hans',
};

function getLanguageCandidates(language: string): string[] {
  const pokeApiLanguage = POKEAPI_LANGUAGE_BY_LOCALE[language] ?? language;
  return pokeApiLanguage === language ? [pokeApiLanguage, 'en'] : [pokeApiLanguage, language, 'en'];
}

export function getLocalizedMoveName(move: MoveDetail, language: string): string {
  const localizedName = getLanguageCandidates(language)
    .map((candidate) => move.names?.find((entry) => entry.language.name === candidate)?.name)
    .find((name): name is string => Boolean(name));

  return localizedName ?? move.name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getLocalizedMoveEffectEntry(
  move: MoveDetail,
  language: string,
): MoveDetail['effect_entries'][number] | undefined {
  return getLanguageCandidates(language)
    .map((candidate) => move.effect_entries.find((entry) => entry.language.name === candidate))
    .find((entry): entry is MoveDetail['effect_entries'][number] => Boolean(entry));
}

export function getLocalizedMoveFlavorText(move: MoveDetail, language: string): string | null {
  const languageCandidates = getLanguageCandidates(language);
  for (const candidate of languageCandidates) {
    const entries = move.flavor_text_entries.filter((entry) => entry.language.name === candidate);
    const flavorText = entries.at(-1)?.flavor_text;
    if (flavorText) return flavorText.replace(/\n|\f/g, ' ').trim();
  }

  return null;
}
