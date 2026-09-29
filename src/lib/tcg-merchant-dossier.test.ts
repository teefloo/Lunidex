import { describe, expect, it } from 'vitest';
import { searchReviewedMerchants, type MerchantDossierV1 } from './tcg-merchant-dossier';

const evidence = { field: 'registration' as const, value: '123456789', sourceUrl: 'https://example.org/registry', verifiedAt: '2026-09-29' };
const dossiers: MerchantDossierV1[] = [
  { id: 'one', displayName: 'Étoile Cartes', reviewStatus: 'reviewed', evidence: [evidence] },
  { id: 'two', displayName: 'Étoile Brouillon', reviewStatus: 'draft', evidence: [evidence] },
];

describe('searchReviewedMerchants', () => {
  it('returns only reviewed dossiers with evidence for an accent-insensitive query', () => {
    expect(searchReviewedMerchants(dossiers, 'etoile').map((item) => item.id)).toEqual(['one']);
  });

  it('does not expose a reviewed dossier without evidence', () => {
    expect(searchReviewedMerchants([{ id: 'empty', displayName: 'Étoile', reviewStatus: 'reviewed', evidence: [] }], 'etoile')).toEqual([]);
  });
});
