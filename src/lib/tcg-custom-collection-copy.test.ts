import { describe, expect, it } from 'vitest';
import { formatTCGCustomCollectionCopyText } from './tcg-custom-collection-copy';

const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const addedAt = '2026-10-19T10:00:00.000Z';

describe('custom collection copy list', () => {
  it('formats saved physical order, repeats duplicates, and keeps one wanted placeholder', () => {
    const order = [
      { cardId: 'jungle-56', language: 'en' as const, copyIndex: 0 },
      { cardId: 'base1-4', language: 'en' as const, copyIndex: 0, copyCount: 2 },
      { cardId: 'unknown-99', language: 'en' as const, copyIndex: 0 },
    ];
    const details = [
      {
        ref: { collectionId, cardId: 'base1-4', language: 'en' as const, cardName: 'Charizard', addedAt, quantity: 2 },
        card: { id: 'base1-4', localId: '004', name: 'Charizard', set: { id: 'base1', name: 'Base Set', cardCount: { official: 102, total: 102 } } },
        unavailable: false,
      },
      {
        ref: { collectionId, cardId: 'jungle-56', language: 'en' as const, cardName: 'Zubat', addedAt, quantity: 1 },
        card: { id: 'jungle-56', localId: '056', name: 'Zubat', set: { id: 'jungle', name: 'Jungle', cardCount: { official: 0, total: 64 } } },
        unavailable: false,
      },
      {
        ref: { collectionId, cardId: 'unknown-99', language: 'en' as const, cardName: 'Missing card', addedAt, quantity: 0 },
        card: { id: 'unknown-99', localId: '99', name: 'unknown-99' },
        unavailable: true,
      },
    ];

    expect(formatTCGCustomCollectionCopyText(order, details)).toBe(
      'Zubat JUNGLE 056/64, Charizard BASE1 004/102, Charizard BASE1 004/102, Missing card 99',
    );
  });

  it('uses the card ID when catalogue metadata is unavailable', () => {
    expect(formatTCGCustomCollectionCopyText([
      { cardId: 'sv10-001', language: 'fr', copyIndex: 0 },
    ], [])).toBe('sv10-001 001');
  });
});
