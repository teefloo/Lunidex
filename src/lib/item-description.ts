import type { GraphQLItemData } from '@/types/pokemon';

type ItemDescriptionSource = Pick<
  GraphQLItemData,
  'pokemon_v2_itemeffecttexts' | 'pokemon_v2_itemflavortexts'
>;

export function cleanItemText(value: string | null | undefined): string {
  return value?.replace(/[\n\f]+/g, ' ').trim() || '';
}

export function getItemEffectDescription(item: ItemDescriptionSource): string {
  const effect = item.pokemon_v2_itemeffecttexts?.[0];

  return (
    cleanItemText(effect?.effect) ||
    cleanItemText(effect?.short_effect)
  );
}

export function getItemDescription(item: ItemDescriptionSource): string {
  const effect = item.pokemon_v2_itemeffecttexts?.[0];
  const flavor = item.pokemon_v2_itemflavortexts?.[0];

  return (
    cleanItemText(effect?.short_effect) ||
    getItemEffectDescription(item) ||
    cleanItemText(flavor?.flavor_text)
  );
}
