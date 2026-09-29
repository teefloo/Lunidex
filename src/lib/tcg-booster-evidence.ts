/** A public estimate requires an independently checkable opening sample. */
export interface OpeningSampleV1 {
  version: 1;
  source: { name: string; url: string };
  setId: string;
  region: string;
  boosterType: string;
  period: { from: string; to: string };
  packCount: number;
  cardsPerPack: number;
  rarityCounts: { rarity: string; count: number }[];
  outcomes: { cardId: string; variant: string; rarity: string; count: number }[];
}

export interface CardmarketPriceSnapshotV1 {
  version: 1;
  source: 'Cardmarket';
  currency: 'EUR';
  region: string;
  setId: string;
  boosterType: string;
  observedAt: string;
  packPriceEur: number;
  packPriceUrl: string;
  quotes: { cardId: string; variant: string; priceEur: number; url: string }[];
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function label(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpUrl(value: unknown): value is string {
  if (!label(value)) return false;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

function cardmarketUrl(value: unknown): value is string {
  if (!httpUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return host === 'cardmarket.com' || host.endsWith('.cardmarket.com');
}

function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonnegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function unique(values: string[]): boolean { return new Set(values).size === values.length; }
function outcomeKey(cardId: string, variant: string): string { return `${cardId}\u0000${variant}`; }

export function validateOpeningSample(value: unknown): OpeningSampleV1 | null {
  const input = record(value);
  if (!input || input.version !== 1) return null;
  const source = record(input.source);
  const period = record(input.period);
  if (!source || !label(source.name) || !httpUrl(source.url)
    || !label(input.setId) || !label(input.region) || !label(input.boosterType)
    || !period || !date(period.from) || !date(period.to) || period.from > period.to
    || !positiveInteger(input.packCount) || !positiveInteger(input.cardsPerPack)
    || !Array.isArray(input.rarityCounts) || input.rarityCounts.length === 0
    || !Array.isArray(input.outcomes) || input.outcomes.length === 0) return null;

  const rarities = input.rarityCounts.map(record);
  const outcomes = input.outcomes.map(record);
  if (rarities.some((item) => !item || !label(item.rarity) || !positiveInteger(item.count))
    || outcomes.some((item) => !item || !label(item.cardId) || !label(item.variant)
      || !label(item.rarity) || !positiveInteger(item.count))) return null;
  const rarityRows = rarities as Record<string, unknown>[];
  const outcomeRows = outcomes as Record<string, unknown>[];
  const rarityKeys = rarityRows.map((item) => item.rarity as string);
  if (!unique(rarityKeys) || !unique(outcomeRows.map((item) => outcomeKey(item.cardId as string, item.variant as string)))) return null;
  const total = outcomeRows.reduce((sum, item) => sum + (item.count as number), 0);
  if (total !== input.packCount * input.cardsPerPack) return null;
  for (const rarity of rarityRows) {
    const observed = outcomeRows.filter((item) => item.rarity === rarity.rarity)
      .reduce((sum, item) => sum + (item.count as number), 0);
    if (observed !== rarity.count) return null;
  }
  if (outcomeRows.some((item) => !rarityKeys.includes(item.rarity as string))) return null;
  return value as OpeningSampleV1;
}

export function validatePriceSnapshot(value: unknown): CardmarketPriceSnapshotV1 | null {
  const input = record(value);
  if (!input || input.version !== 1 || input.source !== 'Cardmarket' || input.currency !== 'EUR'
    || !label(input.region) || !label(input.setId) || !label(input.boosterType)
    || !date(input.observedAt) || !nonnegativeNumber(input.packPriceEur)
    || !cardmarketUrl(input.packPriceUrl) || !Array.isArray(input.quotes) || input.quotes.length === 0) return null;
  const quotes = input.quotes.map(record);
  if (quotes.some((quote) => !quote || !label(quote.cardId) || !label(quote.variant)
    || !nonnegativeNumber(quote.priceEur) || !cardmarketUrl(quote.url))) return null;
  if (!unique((quotes as Record<string, unknown>[]).map((quote) => outcomeKey(quote.cardId as string, quote.variant as string)))) return null;
  return value as CardmarketPriceSnapshotV1;
}

export function calculatePullRates(value: unknown) {
  const sample = validateOpeningSample(value);
  if (!sample) return null;
  return sample.rarityCounts.map(({ rarity, count }) => ({
    rarity, expectedCopiesPerPack: count / sample.packCount, observedCount: count, packCount: sample.packCount,
  }));
}

export function calculateExpectedValue(sampleInput: unknown, priceInput: unknown) {
  const sample = validateOpeningSample(sampleInput);
  const prices = validatePriceSnapshot(priceInput);
  if (!sample || !prices || sample.setId !== prices.setId || sample.region !== prices.region
    || sample.boosterType !== prices.boosterType || prices.observedAt < sample.period.to) return null;
  const quotes = new Map(prices.quotes.map((quote) => [outcomeKey(quote.cardId, quote.variant), quote.priceEur]));
  if (sample.outcomes.some((outcome) => !quotes.has(outcomeKey(outcome.cardId, outcome.variant)))) return null;
  const gross = sample.outcomes.reduce((sum, outcome) =>
    sum + outcome.count * quotes.get(outcomeKey(outcome.cardId, outcome.variant))!, 0) / sample.packCount;
  const grossCardValueEur = Math.round(gross * 100) / 100;
  return {
    grossCardValueEur,
    packPriceEur: prices.packPriceEur,
    differenceEur: Math.round((grossCardValueEur - prices.packPriceEur) * 100) / 100,
    pricedOutcomes: sample.outcomes.length,
    observedOutcomes: sample.outcomes.length,
    packCount: sample.packCount,
  };
}
