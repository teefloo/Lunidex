export type ProductMeasurementConsent = 'granted' | 'denied' | 'unset';

export const PRODUCT_CONSENT_VERSION = 3 as const;
export const PRODUCT_CONSENT_POLICY_VERSION = '2026-09-19' as const;
export const PRODUCT_MEASUREMENT_CONSENT_COOKIE = 'primedex-product-measurement-consent';
export const PRODUCT_MEASUREMENT_CONSENT_COOKIE_MAX_AGE = 31_536_000;

export interface ProductConsent {
  version: typeof PRODUCT_CONSENT_VERSION;
  policyVersion: typeof PRODUCT_CONSENT_POLICY_VERSION;
  chosenAt: string;
  audiencePerformance: ProductMeasurementConsent;
  productMeasurement: ProductMeasurementConsent;
}

export function createUnsetProductConsent(): ProductConsent {
  return {
    version: PRODUCT_CONSENT_VERSION,
    policyVersion: PRODUCT_CONSENT_POLICY_VERSION,
    chosenAt: '',
    audiencePerformance: 'unset',
    productMeasurement: 'unset',
  };
}

export function getProductMeasurementConsentFromCookie(
  cookieHeader: string | null | undefined,
): ProductMeasurementConsent {
  if (!cookieHeader) return 'unset';

  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PRODUCT_MEASUREMENT_CONSENT_COOKIE}=`))
    ?.slice(PRODUCT_MEASUREMENT_CONSENT_COOKIE.length + 1);

  return value === 'granted' || value === 'denied' ? value : 'unset';
}
