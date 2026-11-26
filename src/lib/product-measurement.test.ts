import type { PostHogEventName, PostHogProperties } from './posthog-events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ capturePostHogEvent: vi.fn<(event: PostHogEventName, properties: PostHogProperties) => boolean>(() => true), initializePostHog: vi.fn(), syncPostHogConsent: vi.fn() }));
vi.mock('./posthog-client', () => client);
function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); }, removeItem: (key) => { entries.delete(key); }, clear: () => entries.clear(), key: () => null, get length() { return entries.size; } };
}
const consent = { version: 3 as const, policyVersion: '2026-09-19' as const, audiencePerformance: 'denied' as const, productMeasurement: 'granted' as const, chosenAt: '2026-10-07' };

describe('consented TCG milestones', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); client.capturePostHogEvent.mockReturnValue(true);
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T10:00:00Z'));
    vi.stubGlobal('window', { localStorage: memoryStorage(), sessionStorage: memoryStorage(), location: { pathname: '/fr/tcg/start', search: '?source=campaign&campaign=autumn', protocol: 'https:' }, dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { documentElement: { lang: 'fr' }, cookie: '' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('keeps demo events consented, deduplicated and separate from saved activation', async () => {
    const m = await import('./product-measurement');
    const context = { set_id: 'base1', tcg_language: 'en' };
    for (const event of ['tcg_demo_opened', 'tcg_demo_first_interaction', 'tcg_demo_signup_clicked'] as const) {
      expect(await m.trackProductEvent(event, undefined, undefined, context)).toBe(false);
    }
    expect(client.capturePostHogEvent).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
    m.setProductConsent(consent);
    await Promise.all([
      m.trackProductEvent('tcg_demo_opened', undefined, undefined, context),
      m.trackProductEvent('tcg_demo_opened', undefined, undefined, context),
    ]);
    await m.trackProductEvent('tcg_demo_first_interaction', undefined, undefined, context);
    await m.trackProductEvent('tcg_demo_first_interaction', undefined, undefined, context);
    await m.trackProductEvent('tcg_demo_signup_clicked', undefined, undefined, context);
    expect(client.capturePostHogEvent.mock.calls.map(([event]) => event)).toEqual([
      'tcg_demo_opened', 'tcg_demo_first_interaction', 'tcg_demo_signup_clicked',
    ]);
    expect(client.capturePostHogEvent).toHaveBeenCalledWith('tcg_demo_opened', expect.objectContaining({ authenticated: false, ...context }));
    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('primedex-product-measurement-activated-at')).toBeNull();
    await m.trackProductEvent('tcg_demo_opened', undefined, undefined, { ...context, set_id: 'base2' });
    expect(client.capturePostHogEvent).toHaveBeenCalledTimes(4);
  });
  it('does not track or persist attribution before consent', async () => {
    const m = await import('./product-measurement');
    expect(m.getTcgTrackingContext()).toEqual({});
    expect(await m.trackProductEvent('tcg_start_opened')).toBe(false);
    expect(window.localStorage.length).toBe(0); expect(client.capturePostHogEvent).not.toHaveBeenCalled();
  });
  it('reserves milestones against concurrent React effects and tracks direct entries', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    await Promise.all([m.trackProductEvent('tcg_start_opened'), m.trackProductEvent('tcg_start_opened')]);
    expect(client.capturePostHogEvent).toHaveBeenCalledTimes(1);
    expect(client.capturePostHogEvent).toHaveBeenCalledWith('tcg_start_opened', expect.objectContaining({ source: 'campaign', campaign: 'autumn', entry_path: '/go/autumn', locale: 'fr' }));
  });
  it('does not consume a milestone when PostHog is unavailable', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    client.capturePostHogEvent.mockReturnValueOnce(false);
    expect(await m.trackProductEvent('tcg_start_opened')).toBe(false);
    expect(await m.trackProductEvent('tcg_start_opened')).toBe(true);
  });
  it('checks consent again after the SDK import', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    const pending = m.trackProductEvent('tcg_start_opened');
    m.setProductConsent({ ...consent, productMeasurement: 'denied' });
    await pending; expect(client.capturePostHogEvent).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('primedex-tcg-attribution-v1')).toBeNull();
  });
  it('activates once after persistence, keeps campaign, then records one later return', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent); m.setProductTrackingIdentity('account-a');
    await m.trackProductEvent('tcg_set_selected', 'latest_list', undefined, { set_id: 'sv01', tcg_language: 'fr' });
    window.location.search = ''; window.location.pathname = '/fr/tcg/collection/fr/sv01';
    await m.trackTcgPersistedValue({ set_id: 'sv01', tcg_language: 'fr' }, 'account-a');
    await m.trackTcgPersistedValue({ set_id: 'sv01', tcg_language: 'fr' }, 'account-a');
    expect(client.capturePostHogEvent.mock.calls.filter(([event]) => event === 'tcg_activation_completed')).toHaveLength(1);
    expect(client.capturePostHogEvent).toHaveBeenCalledWith('tcg_activation_completed', expect.objectContaining({ source: 'campaign', campaign: 'autumn', activation_method: 'first_persisted_card', persistence: 'neon', authenticated: true }));
    await m.trackReturnAfterActivation('album_open');
    vi.advanceTimersByTime(31 * 60_000);
    await m.trackReturnAfterActivation('album_open'); await m.trackReturnAfterActivation('album_open');

    expect(client.capturePostHogEvent.mock.calls.filter(([event]) => event === 'tcg_returned_after_activation')).toHaveLength(1);
    m.setProductTrackingIdentity('account-b'); vi.advanceTimersByTime(31 * 60_000); await m.trackReturnAfterActivation('album_open');
    expect(client.capturePostHogEvent.mock.calls.filter(([event]) => event === 'tcg_returned_after_activation')).toHaveLength(1);
  });
  it('uses semantic properties rather than replacing acquisition source', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    await m.trackProductEvent('tcg_set_selected', 'search', undefined, { set_id: 'sv01', tcg_language: 'fr' });
    expect(client.capturePostHogEvent).toHaveBeenCalledWith('tcg_set_selected', expect.objectContaining({ source: 'campaign', selection_method: 'search' }));
  });
  it('invalidates pending events when consent is revoked then granted again', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    const pending = m.trackProductEvent('tcg_start_opened');
    m.setProductConsent({ ...consent, productMeasurement: 'denied' }); m.setProductConsent(consent);
    expect(await pending).toBe(false);
    expect(client.capturePostHogEvent).not.toHaveBeenCalled();
  });
  it('invalidates a pending activation when the account changes', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent); m.setProductTrackingIdentity('a');
    const pending = m.trackTcgPersistedValue({ set_id: 'sv01', tcg_language: 'fr' }, 'a');
    m.setProductTrackingIdentity('b'); await pending;
    expect(client.capturePostHogEvent).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('primedex-product-measurement-activated-at')).toBeNull();
  });
  it('records campaign landing before start even before the delayed bridge mounts', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    await m.trackTcgStartOpened({ tcg_language: 'fr' });
    expect(client.capturePostHogEvent.mock.calls.map(([event]) => event)).toEqual(['tcg_campaign_landed', 'tcg_start_opened']);
    expect(fetch).toHaveBeenCalledWith('/api/analytics/product', expect.objectContaining({ body: JSON.stringify({ event: 'tcg_start_opened', propertyA: 'campaign', propertyB: 'autumn' }) }));
  });
  it('does not count continuous consented browsing as a return', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent); m.setProductTrackingIdentity('a');
    await m.trackTcgPersistedValue({ set_id: 'sv01', tcg_language: 'fr' }, 'a');
    vi.advanceTimersByTime(20 * 60_000); m.touchProductMeasurementSession();
    vi.advanceTimersByTime(20 * 60_000);
    expect(await m.trackReturnAfterActivation('album_open')).toBe(false);
  });
  it('keeps attribution until a confirmed OAuth identity and consumes its marker once', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    m.getTcgTrackingContext(); m.rememberProductOauth('google', true);
    window.location.search = ''; m.setProductTrackingIdentity('a');
    expect(m.consumeProductOauth()).toBe('google'); expect(m.consumeProductOauth()).toBeUndefined();
    expect(m.getTcgTrackingContext()).toMatchObject({ source: 'campaign', campaign: 'autumn', authenticated: true });
  });

  it('does not attribute a subsequent password sign-in to cancelled OAuth', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    m.rememberProductOauth('google', true); m.rememberProductOauth('password', false);
    expect(m.consumeProductOauth()).toBeUndefined();
  });

  it('preserves independent Neon aggregate counters when PostHog is disabled', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    client.capturePostHogEvent.mockReturnValue(false);
    await m.trackProductEvent('tcg_start_opened'); await m.trackProductEvent('tcg_start_opened');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('measures a new campaign journey even if a card was viewed earlier in the session', async () => {
    const m = await import('./product-measurement'); m.setProductConsent(consent);
    await m.trackProductEvent('tcg_first_card_interacted');
    window.location.search = '?source=campaign&campaign=next';
    await m.trackProductEvent('tcg_first_card_interacted');
    expect(client.capturePostHogEvent.mock.calls.filter(([event]) => event === 'tcg_first_card_interacted')).toHaveLength(2);
  });

});
