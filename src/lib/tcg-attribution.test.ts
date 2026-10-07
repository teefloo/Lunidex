import { describe, expect, it } from 'vitest';
import { getTcgStartAttribution, parseTcgJourney, resolveTcgJourney, TCG_ATTRIBUTION_TTL_MS } from './tcg-attribution';

describe('TCG acquisition attribution', () => {
  it('validates campaign slugs and accepts only known sources', () => {
    expect(getTcgStartAttribution('?source=campaign&campaign=Summer-2026')).toEqual({ source: 'campaign', campaign: 'summer-2026' });
    expect(getTcgStartAttribution('?source=campaign&campaign=alice@example.com')).toBeUndefined();
    expect(getTcgStartAttribution('?source=unknown')).toBeUndefined();
  });
  it('keeps /go attribution through set navigation, internal CTAs and OAuth reloads', () => {
    const landing = resolveTcgJourney(undefined, '/fr/tcg/start', '?source=campaign&campaign=summer-2026', 100);
    const restored = parseTcgJourney(JSON.stringify(landing), 200);
    expect(resolveTcgJourney(restored, '/fr/tcg/collection/fr/sv01', '?source=catalog', 200)).toEqual(landing);
    expect(landing.entry_path).toBe('/go/summer-2026');
  });
  it('starts a new attribution for a new campaign and expires old attribution', () => {
    const first = resolveTcgJourney(undefined, '/fr/tcg/start', '?source=campaign&campaign=one', 100);
    expect(resolveTcgJourney(first, '/fr/tcg/start', '?source=campaign&campaign=two', 200).campaign).toBe('two');
    expect(parseTcgJourney(JSON.stringify(first), 101 + TCG_ATTRIBUTION_TTL_MS)).toBeUndefined();
    expect(resolveTcgJourney(first, '/en/tcg/start?email=private', '', 101 + TCG_ATTRIBUTION_TTL_MS)).toMatchObject({ source: 'direct', entry_path: '/tcg/start' });
  });
  it('rejects malformed storage and drops arbitrary stored properties', () => {
    expect(parseTcgJourney('{', 100)).toBeUndefined();
    expect(parseTcgJourney(JSON.stringify({ source: 'direct', entry_path: '/fr/tcg/start?token=secret', capturedAt: 10, email: 'private', set_id: 'invalid / id' }), 100)).toEqual({ source: 'direct', capturedAt: 10, entry_path: '/tcg/start', set_id: undefined, tcg_language: undefined });
  });
  it('uses an explicit TCG CTA source after a direct homepage pageview', () => {
    const home = resolveTcgJourney(undefined, '/fr', '', 100);
    expect(resolveTcgJourney(home, '/fr/tcg/start', '?source=home_cta', 200)).toMatchObject({ source: 'home_cta', entry_path: '/' });
  });

});
