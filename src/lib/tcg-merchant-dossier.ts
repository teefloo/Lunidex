/** Internal preparation only. No merchant records are published until reviewed. */
export interface MerchantEvidenceV1 {
  field: 'legal-name' | 'registration' | 'address' | 'website';
  value: string;
  sourceUrl: string;
  verifiedAt: string;
}

export interface MerchantDossierV1 {
  id: string;
  displayName: string;
  reviewStatus: 'draft' | 'reviewed';
  evidence: readonly MerchantEvidenceV1[];
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

export function searchReviewedMerchants(dossiers: readonly MerchantDossierV1[], query: string): MerchantDossierV1[] {
  const needle = normalizeSearch(query);
  return dossiers.filter((dossier) =>
    dossier.reviewStatus === 'reviewed'
    && dossier.evidence.length > 0
    && normalizeSearch(dossier.displayName).includes(needle),
  );
}
