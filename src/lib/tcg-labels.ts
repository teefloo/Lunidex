import { getCanonicalTcgRarity } from './tcg-rarity';

export type TCGLabelTranslator = (
  key: string,
  options?: { defaultValue?: string },
) => string;

export function getTCGCategoryLabel(
  category: string | null | undefined,
  t: TCGLabelTranslator,
): string {
  const key = category === 'Pokemon'
    ? 'tcg.card_category_pokemon'
    : category === 'Trainer'
      ? 'tcg.card_category_trainer'
      : category === 'Energy'
        ? 'tcg.card_category_energy'
        : null;

  return key
    ? t(key, { defaultValue: category ?? 'Unknown' })
    : t('tcg.unknown', { defaultValue: category || 'Unknown' });
}

export function getTCGRarityLabel(
  rarity: string | null | undefined,
  t: TCGLabelTranslator,
): string {
  const raw = rarity?.trim();
  if (!raw) return t('tcg.unknown', { defaultValue: 'Unknown' });

  const canonical = getCanonicalTcgRarity(raw);
  const key = canonical ? `tcg.${canonical}` : 'tcg.unknown';
  return t(key, { defaultValue: raw });
}
