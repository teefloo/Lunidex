import { describe, expect, it } from 'vitest';

import {
  PRODUCT_CONSENT_POLICY_VERSION,
  PRODUCT_CONSENT_VERSION,
  createUnsetProductConsent,
  getProductMeasurementConsentFromCookie,
} from './posthog-consent';

describe('PostHog consent contract', () => {
  it('invalidates the previous policy version by defaulting to unset', () => {
    const consent = createUnsetProductConsent();
    expect(consent.version).toBe(PRODUCT_CONSENT_VERSION);
    expect(consent.policyVersion).toBe(PRODUCT_CONSENT_POLICY_VERSION);
    expect(consent.productMeasurement).toBe('unset');
  });

  it('reads only the dedicated same-origin consent cookie', () => {
    expect(getProductMeasurementConsentFromCookie('other=value; primedex-product-measurement-consent=granted')).toBe('granted');
    expect(getProductMeasurementConsentFromCookie('primedex-product-measurement-consent=denied')).toBe('denied');
    expect(getProductMeasurementConsentFromCookie('primedex-consent-v2=granted')).toBe('unset');
  });
});
