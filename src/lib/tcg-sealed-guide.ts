/** Pure calculations for the public Cardmarket sealed price guide. */
export interface GuideObservation {
  productId: number;
  day: string;
  sourceAt: string;
  trendCents: number | null;
}

export interface GuideProduct {
  id: number;
  name: string;
  expansionId: number;
  active: boolean;
}

export interface GuideBasket {
  version: 'launch-v1';
  day: string;
  sourceAt: string;
  items: Array<{ productId: number; trendCents: number }>;
}

export interface GuideIndexPoint {
  day: string;
  sourceAt: string;
  value: number;
  coverage: number;
}

export interface ProductMover {
  productId: number;
  name: string;
  expansionId: number;
  changePercent: number;
  fromDay: string;
  toDay: string;
  fromSourceAt: string;
  toSourceAt: string;
  elapsedDays: number;
}

export interface SeriesMover {
  expansionId: number;
  name: string;
  changePercent: number;
  coverage: number;
  comparableProducts: number;
  totalProducts: number;
  fromDay: string;
  toDay: string;
}

export type GuideUnavailable = { status: 'unavailable'; reason: 'missing_basket' | 'insufficient_coverage' | 'stale' | 'no_observations' };
export type GuideResult<T> = { status: 'available' } & T | GuideUnavailable;

const MIN_BASKET_SIZE = 25;
const MIN_COVERAGE = 0.8;
const MAX_AGE_DAYS = 3;
const DAY_MS = 86_400_000;

function validDate(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00.000Z`));
}

function ageDays(asOf: string, sourceAt: string): number {
  return (Date.parse(`${asOf}T23:59:59.999Z`) - Date.parse(sourceAt)) / DAY_MS;
}

function isFresh(asOf: string, sourceAt: string): boolean {
  const age = ageDays(asOf, sourceAt);
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_DAYS;
}

function positiveTrend(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

/** Called only after a successful, validated source download. Never update a saved basket. */
export function seedLaunchBasket(products: readonly GuideProduct[], observations: readonly GuideObservation[]): GuideBasket | null {
  const active = new Set(products.filter((product) => product.active).map((product) => product.id));
  const valid = observations.filter((point) => active.has(point.productId) && positiveTrend(point.trendCents) && validDate(point.day) && Number.isFinite(Date.parse(point.sourceAt)));
  if (valid.length < MIN_BASKET_SIZE) return null;
  const latestSourceAt = valid.map((point) => point.sourceAt).sort().at(-1);
  const sourcePoints = valid.filter((point) => point.sourceAt === latestSourceAt);
  const items = [...new Map(sourcePoints.map((point) => [point.productId, { productId: point.productId, trendCents: point.trendCents as number }])).values()]
    .sort((a, b) => a.productId - b.productId);
  if (items.length < MIN_BASKET_SIZE || !latestSourceAt) return null;
  const sourceDay = new Date(latestSourceAt).toISOString().slice(0, 10);
  return { version: 'launch-v1', day: sourceDay, sourceAt: latestSourceAt, items };
}

function validBasket(value: GuideBasket | null): value is GuideBasket {
  return value !== null && value.version === 'launch-v1' && validDate(value.day)
    && Number.isFinite(Date.parse(value.sourceAt)) && value.items.length >= MIN_BASKET_SIZE
    && new Set(value.items.map((item) => item.productId)).size === value.items.length
    && value.items.every((item) => Number.isSafeInteger(item.productId) && item.productId > 0 && positiveTrend(item.trendCents));
}

/** Base 100; each observed day averages the price relative of comparable basket members. */
export function buildGuideIndex(observations: readonly GuideObservation[], basket: GuideBasket | null, asOf: string): GuideResult<{ version: GuideBasket['version']; basketSize: number; points: GuideIndexPoint[] }> {
  if (!validBasket(basket)) return { status: 'unavailable', reason: 'missing_basket' };
  const baseline = new Map(basket.items.map((item) => [item.productId, item.trendCents]));
  const byPublication = new Map<string, Map<number, GuideObservation>>();
  for (const point of observations) {
    if (point.sourceAt <= basket.sourceAt || point.day <= basket.day || point.day > asOf || !validDate(point.day) || !Number.isFinite(Date.parse(point.sourceAt)) || !positiveTrend(point.trendCents) || !baseline.has(point.productId)) continue;
    const publication = byPublication.get(point.sourceAt) ?? new Map<number, GuideObservation>();
    publication.set(point.productId, point);
    byPublication.set(point.sourceAt, publication);
  }
  // A source publication is comparable only on its own. Combining partial
  // imports from separate publications on the same calendar day would invent
  // coverage that Cardmarket never reported at one point in time.
  const latestValidPublicationByDay = new Map<string, GuideIndexPoint>();
  for (const [sourceAt, rows] of byPublication) {
    const comparable = [...rows.values()];
    const coverage = comparable.length / basket.items.length;
    if (coverage < MIN_COVERAGE) continue;
    const day = comparable[0]?.day;
    if (!day) continue;
    const relative = comparable.reduce((sum, point) => sum + (point.trendCents as number) / baseline.get(point.productId)!, 0) / comparable.length;
    const candidate = { day, sourceAt, value: Math.round(100 * relative * 10_000) / 10_000, coverage };
    const existing = latestValidPublicationByDay.get(day);
    if (!existing || candidate.sourceAt > existing.sourceAt) latestValidPublicationByDay.set(day, candidate);
  }
  const points: GuideIndexPoint[] = [{ day: basket.day, sourceAt: basket.sourceAt, value: 100, coverage: 1 }];
  points.push(...[...latestValidPublicationByDay.values()].sort((a, b) => a.day.localeCompare(b.day)));
  if (points.length < 2) return { status: 'unavailable', reason: 'insufficient_coverage' };
  if (!isFresh(asOf, points.at(-1)!.sourceAt)) return { status: 'unavailable', reason: 'stale' };
  return { status: 'available', version: basket.version, basketSize: basket.items.length, points };
}

function allProductMovers(products: readonly GuideProduct[], observations: readonly GuideObservation[], asOf: string): ProductMover[] {
  const active = new Map(products.filter((product) => product.active).map((product) => [product.id, product]));
  const byProduct = new Map<number, GuideObservation[]>();
  for (const point of observations) {
    if (!active.has(point.productId) || point.day > asOf || !validDate(point.day) || !Number.isFinite(Date.parse(point.sourceAt))) continue;
    const history = byProduct.get(point.productId) ?? [];
    history.push(point);
    byProduct.set(point.productId, history);
  }
  const movers: ProductMover[] = [];
  for (const [productId, history] of byProduct) {
    const ordered = history.sort((a, b) => a.sourceAt.localeCompare(b.sourceAt) || a.day.localeCompare(b.day));
    const latest = ordered.at(-1);
    const previous = ordered.slice(0, -1).reverse().find((point) => point.sourceAt !== latest?.sourceAt);
    if (!latest || !previous || !isFresh(asOf, latest.sourceAt) || !positiveTrend(latest.trendCents) || !positiveTrend(previous.trendCents)) continue;
    const elapsedDays = (Date.parse(latest.sourceAt) - Date.parse(previous.sourceAt)) / DAY_MS;
    if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) continue;
    const product = active.get(productId)!;
    movers.push({ productId, name: product.name, expansionId: product.expansionId,
      changePercent: ((latest.trendCents as number) / (previous.trendCents as number) - 1) * 100,
      fromDay: previous.day, toDay: latest.day, fromSourceAt: previous.sourceAt, toSourceAt: latest.sourceAt, elapsedDays });
  }
  return movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent) || a.productId - b.productId);
}

export function buildProductMovers(products: readonly GuideProduct[], observations: readonly GuideObservation[], asOf: string): GuideResult<{ movers: ProductMover[] }> {
  const movers = allProductMovers(products, observations, asOf);
  return movers.length ? { status: 'available', movers: movers.slice(0, 10) } : { status: 'unavailable', reason: 'no_observations' };
}

/** A series is shown only for an explicitly curated expansion and sufficient paired products. */
export function buildSeriesMovers(products: readonly GuideProduct[], observations: readonly GuideObservation[], asOf: string, mappings: readonly { expansionId: number; name: string }[]): GuideResult<{ movers: SeriesMover[] }> {
  const productMovers = allProductMovers(products, observations, asOf);
  const movers: SeriesMover[] = [];
  for (const mapping of mappings) {
    const totalProducts = products.filter((product) => product.active && product.expansionId === mapping.expansionId).length;
    if (totalProducts < 5) continue;
    const comparable = productMovers.filter((mover) => mover.expansionId === mapping.expansionId);
    const coverage = comparable.length / totalProducts;
    if (coverage < MIN_COVERAGE) continue;
    movers.push({ expansionId: mapping.expansionId, name: mapping.name, coverage,
      comparableProducts: comparable.length, totalProducts,
      changePercent: comparable.reduce((sum, mover) => sum + mover.changePercent, 0) / comparable.length,
      fromDay: comparable.map((mover) => mover.fromDay).sort()[0],
      toDay: comparable.map((mover) => mover.toDay).sort().at(-1)!,
    });
  }
  movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent) || a.expansionId - b.expansionId);
  return movers.length ? { status: 'available', movers } : { status: 'unavailable', reason: 'insufficient_coverage' };
}
