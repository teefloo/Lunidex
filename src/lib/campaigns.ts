const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){0,4}$/;

export const MAX_CAMPAIGN_SLUG_LENGTH = 40;

/**
 * Campaign identifiers are deliberately boring: they are used in public
 * links and aggregate measurement only, never as redirect destinations.
 */
export function normalizeCampaignSlug(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (
    normalized.length === 0
    || normalized.length > MAX_CAMPAIGN_SLUG_LENGTH
    || !CAMPAIGN_SLUG_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
}
