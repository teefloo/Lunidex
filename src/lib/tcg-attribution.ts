import { normalizeCampaignSlug } from '@/lib/campaigns';
import { normalizePostHogRoute } from '@/lib/posthog-privacy';
import { isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';

export type TcgStartSource = 'home_cta' | 'catalog' | 'direct' | 'seo' | 'campaign';
export interface TcgStartAttribution { source: TcgStartSource; campaign?: string }
export interface TcgJourney extends TcgStartAttribution {
  entry_path: string;
  capturedAt: number;
  set_id?: string;
  tcg_language?: TCGCardLanguage;
}
export const TCG_ATTRIBUTION_KEY = 'primedex-tcg-attribution-v1';
export const TCG_ATTRIBUTION_TTL_MS = 30 * 86_400_000;

export function getTcgStartAttribution(search: string): TcgStartAttribution | undefined {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  if (source === 'campaign') {
    const campaign = normalizeCampaignSlug(params.get('campaign'));
    return campaign ? { source, campaign } : undefined;
  }
  return source === 'home_cta' || source === 'catalog' || source === 'direct' || source === 'seo'
    ? { source } : undefined;
}

export function normalizeTrackingSetId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

export function parseTcgJourney(value: string | null, now: number): TcgJourney | undefined {
  try {
    const saved = JSON.parse(value ?? 'null') as Partial<TcgJourney> | null;
    if (!saved || typeof saved.capturedAt !== 'number' || saved.capturedAt > now
      || now - saved.capturedAt > TCG_ATTRIBUTION_TTL_MS || typeof saved.entry_path !== 'string') return;
    const params = new URLSearchParams({ source: saved.source ?? '' });
    if (typeof saved.campaign === 'string') params.set('campaign', saved.campaign);
    const attribution = getTcgStartAttribution(params.toString());
    if (!attribution) return;
    return { ...attribution, capturedAt: saved.capturedAt,
      entry_path: normalizePostHogRoute(saved.entry_path),
      set_id: normalizeTrackingSetId(saved.set_id),
      tcg_language: isTCGCardLanguage(saved.tcg_language) ? saved.tcg_language : undefined };
  } catch { return; }
}

/** Keep acquisition attribution through internal navigation and full OAuth reloads. */
export function resolveTcgJourney(previous: TcgJourney | undefined, pathname: string, search: string, now: number): TcgJourney {
  const incoming = getTcgStartAttribution(search);
  const valid = previous && now - previous.capturedAt <= TCG_ATTRIBUTION_TTL_MS && previous.capturedAt <= now
    ? previous : undefined;
  if (valid?.source === 'direct' && incoming && incoming.source !== 'direct' && incoming.source !== 'campaign') {
    return { ...valid, ...incoming };
  }
  if (valid && (!incoming || incoming.source !== 'campaign' || incoming.campaign === valid.campaign)) return valid;
  return { ...(incoming ?? { source: 'direct' }), capturedAt: now,
    entry_path: incoming?.campaign ? `/go/${incoming.campaign}` : normalizePostHogRoute(pathname) };
}
