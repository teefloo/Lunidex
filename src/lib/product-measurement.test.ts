import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProductConsent, getServerProductConsent, getTcgStartAttribution, getTcgStartSource, markProductActivation, setProductConsent, trackProductEvent, trackReturnAfterActivation } from './product-measurement';

const consent = { version: 2 as const, policyVersion: '2026-07-29' as const, chosenAt: '2026-07-30T00:00:00.000Z', audiencePerformance: 'denied' as const, productMeasurement: 'granted' as const };

describe('product measurement consent and return', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response())); });
  it('does not upgrade a legacy consent', () => {
    localStorage.setItem('primedex-cookie-consent', 'accepted');
    localStorage.setItem('primedex-consent-v2', JSON.stringify({ version: 1, productMeasurement: 'granted' }));
    expect(getProductConsent().productMeasurement).toBe('unset');
  });
  it('keeps the server snapshot at the consent default during hydration', () => {
    setProductConsent({ ...consent, audiencePerformance: 'granted' });
    expect(getProductConsent().audiencePerformance).toBe('granted');
    expect(getServerProductConsent().audiencePerformance).toBe('unset');
    expect(getServerProductConsent().productMeasurement).toBe('unset');
  });
  it('uses only declared start sources and does not call every visit direct', () => {
    expect(getTcgStartSource('?source=home_cta')).toBe('home_cta');
    expect(getTcgStartSource('?source=card-name')).toBeUndefined();
    expect(getTcgStartSource('')).toBeUndefined();
    expect(getTcgStartAttribution('?source=campaign&campaign=summer-2026')).toEqual({ source: 'campaign', campaign: 'summer-2026' });
    expect(getTcgStartAttribution('?source=campaign&campaign=https%3A%2F%2Fevil.test')).toBeUndefined();
  });
  it('sends nothing until consent and stops after withdrawal', () => { trackProductEvent('tcg_start_opened', 'direct'); expect(fetch).not.toHaveBeenCalled(); setProductConsent(consent); trackProductEvent('tcg_start_opened', 'direct'); expect(fetch).toHaveBeenCalledTimes(1); setProductConsent({ ...consent, productMeasurement: 'denied' }); trackProductEvent('tcg_set_selected', 'search'); expect(fetch).toHaveBeenCalledTimes(1); });
  it('only counts a return in a later session', () => { setProductConsent(consent); markProductActivation(); trackReturnAfterActivation('album_open'); expect(fetch).not.toHaveBeenCalled(); sessionStorage.clear(); trackReturnAfterActivation('album_open'); expect(fetch).toHaveBeenCalledWith('/api/analytics/product', expect.objectContaining({ body: expect.stringContaining('day_0_7') })); });
});
