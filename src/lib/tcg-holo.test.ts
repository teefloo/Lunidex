import { describe, expect, it } from 'vitest';
import type { TCGCard } from '@/types/tcg';
import { getTCGHoloData, getTCGHoloRarity } from './tcg-holo';

const baseCard: TCGCard = {
  id: 'sv1-001',
  localId: '001',
  name: 'Bulbasaur',
  image: 'https://assets.tcgdex.net/en/sv/sv1/001',
  category: 'Pokemon',
};

describe('tcg holo mapping', () => {
  it.each([
    ['Common', 'common'],
    ['Uncommon', 'uncommon'],
    ['Rare', 'rare'],
    ['Rare Holo', 'rare holo'],
    ['Rare Holo Cosmos', 'rare holo cosmos'],
    ['Rare Holo V', 'rare holo v'],
    ['Rare Holo VMAX', 'rare holo vmax'],
    ['Rare Holo VSTAR', 'rare holo vstar'],
    ['Rare Rainbow', 'rare rainbow'],
    ['Rare Secret', 'rare secret'],
    ['Rare Shiny', 'rare shiny'],
    ['Rare Shiny V', 'rare shiny v'],
    ['Rare Shiny VMAX', 'rare shiny vmax'],
    ['Amazing Rare', 'amazing rare'],
    ['Radiant Rare', 'radiant rare'],
    ['Ultra Rare', 'rare ultra'],
    ['Illustration Rare', 'rare ultra'],
    ['Special Illustration Rare', 'rare ultra'],
    ['Hyper Rare', 'rare secret'],
    ['Double Rare', 'rare holo v'],
  ])('maps %s to the pokemon-cards-css rarity %s', (rarity, expectedRarity) => {
    const data = getTCGHoloData({ ...baseCard, rarity });

    expect(data.rarity).toBe(expectedRarity);
  });

  it('maps reverse holo suffix cards to the reverse holo effect', () => {
    const data = getTCGHoloData({
      ...baseCard,
      rarity: 'Rare',
      suffix: 'Reverse Holo',
    });

    expect(data.rarity).toBe('reverse holo');
  });

  it('maps alternate art cards to the rainbow alt effect', () => {
    const data = getTCGHoloData({
      ...baseCard,
      id: 'swsh7-167',
      localId: '167',
      rarity: 'Rare Ultra',
      set: { id: 'swsh7', name: 'Evolving Skies' },
    });

    expect(data.rarity).toBe('rare rainbow alt');
  });

  it('maps EX and GX cards to the v-style holo effect', () => {
    const exData = getTCGHoloData({
        ...baseCard,
        id: 'xy1-001',
        name: 'Chesnaught-EX',
        rarity: 'Ultra Rare',
      });

    const gxData = getTCGHoloData({
        ...baseCard,
        id: 'sm3-147',
        name: 'Charizard-GX',
        rarity: 'Ultra Rare',
      });

    expect(exData.rarity).toBe('rare holo v');
    expect(gxData.rarity).toBe('rare holo v');
  });

  it('treats V-UNION cards as a v-style subtype', () => {
    const data = getTCGHoloData({
      ...baseCard,
      id: 'swsh45-005',
      localId: '005',
      name: 'Mewtwo V-UNION',
      rarity: 'Rare Holo V',
    });

    expect(data.rarity).toBe('rare holo v');
    expect(data.subtypes).toBe('v-union');
  });

  it('detects trainer gallery numbers for data attributes', () => {
    const data = getTCGHoloData({
      ...baseCard,
      id: 'swsh11tg-TG03',
      localId: 'TG03',
      rarity: 'Trainer Gallery',
      set: { id: 'swsh11tg', name: 'Lost Origin Trainer Gallery' },
      variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true },
    });

    expect(data.rarity).toBe('trainer gallery rare holo');
    expect(data.isTrainerGallery).toBe(true);
  });

  it('maps cosmos promo cards without affecting trainer gallery promos', () => {
    const data = getTCGHoloData({
      ...baseCard,
      id: 'swshp-SWSH010',
      localId: 'SWSH010',
      rarity: 'Promo',
      set: { id: 'swshp', name: 'Sword & Shield Promo Cards' },
      variants: { firstEdition: false, holo: false, normal: true, reverse: false, wPromo: true },
    });

    expect(data.rarity).toBe('rare holo cosmos');
    expect(data.hasHoloEffect).toBe(true);
  });

  it.each([
    ['base1-001', 'base1', 'pokemon-wotc'],
    ['ex6-001', 'ex6', 'pokemon-ex'],
    ['dp4-001', 'dp4', 'pokemon-dp-hgss'],
    ['bw7-001', 'bw7', 'pokemon-bw'],
    ['sv1-001', 'sv1', 'pokemon-modern'],
  ])('maps %s to the %s art window', (id, setId, expected) => {
    expect(getTCGHoloData({
      ...baseCard,
      id,
      rarity: 'Rare Holo',
      set: { id: setId, name: setId },
    }).artWindow).toBe(expected);
  });

  it('keeps basic rarities effect-free', () => {
    expect(getTCGHoloData({ ...baseCard, rarity: 'Common' }).hasHoloEffect).toBe(false);
    expect(getTCGHoloData({ ...baseCard, rarity: 'Rare Holo' }).hasHoloEffect).toBe(true);
  });

  it('uses TCGdex holo variants to distinguish classic rare holos', () => {
    expect(getTCGHoloRarity({
      ...baseCard,
      rarity: 'Rare',
      variants: { firstEdition: true, holo: true, normal: false, reverse: false, wPromo: false },
    })).toBe('rare holo');
  });

  it('maps holo rare energy cards to the classic holo effect', () => {
    const data = getTCGHoloData({
      id: 'me03-087',
      localId: '087',
      name: 'Énergie Fighting Rocheuse',
      image: 'https://assets.tcgdex.net/fr/me/me03/087',
      rarity: 'Rare',
      category: 'Energy',
      energyType: 'De base',
      variants: { firstEdition: false, holo: true, normal: false, reverse: true, wPromo: false },
    });

    expect(data.rarity).toBe('rare holo');
    expect(data.supertype).toBe('energy');
    expect(data.artWindow).toBe('energy');
    expect(data.hasHoloEffect).toBe(true);
  });
});
