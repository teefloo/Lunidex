import { SEALED_RELEASES_V1 } from '@/content/tcg/sealed-releases.v1';
import { formatReleaseWindow, getReleaseWindowBounds, type ReleaseWindow, type SealedReleaseV1 } from '@/lib/tcg-release-calendar';
import type { SupportedLanguage } from '@/lib/languages';

/** Cardmarket expansion IDs mapped to reviewed French-market release records. */
const EXPANSION_RELEASE_IDS: Readonly<Record<number, readonly string[]>> = {
  5335: ['foudre-noire', 'flamme-blanche'],
  5402: ['ecarlate-et-violet-151'],
  5546: ['destinees-de-paldea'],
  5589: ['forces-temporelles'],
  5691: ['mascarade-crepusculaire'],
  5760: ['fable-nebuleuse'],
  5802: ['couronne-stellaire'],
  5879: ['etincelles-deferlantes'],
  5944: ['evolutions-prismatiques'],
  6006: ['aventures-ensemble'],
  6096: ['rivalites-destinees'],
  6134: ['foudre-noire'],
  6135: ['flamme-blanche'],
  6209: ['mega-evolution'],
  6299: ['mega-evolution-flammes-fantasmagoriques'],
  6395: ['mega-evolution-heros-transcendants'],
  6443: ['mega-evolution-equilibre-parfait'],
  6517: ['mega-evolution-chaos-ascendant'],
  6569: ['mega-evolution-nuit-noire'],
  6601: ['pokemon-30th-anniversary-expansion'],
};

const RELEASE_BY_ID = new Map<string, SealedReleaseV1>(
  SEALED_RELEASES_V1.map((release) => [release.id, release]),
);

export interface PublicMarketReleaseDate {
  window: ReleaseWindow;
  source: 'product' | 'expansion';
}

export interface PublicMarketReleaseDateRow {
  id: number;
  start: string;
  end: string;
}

function releaseDate(release: SealedReleaseV1, source: PublicMarketReleaseDate['source']): PublicMarketReleaseDate {
  return { window: release.window, source };
}

function expansionRelease(expansionId: number): SealedReleaseV1 | undefined {
  const candidates = (EXPANSION_RELEASE_IDS[expansionId] ?? [])
    .map((id) => RELEASE_BY_ID.get(id))
    .filter((release): release is SealedReleaseV1 => release?.kind === 'expansion' && release.market === 'FR');
  if (!candidates.length) return undefined;
  const bounds = candidates.map((candidate) => getReleaseWindowBounds(candidate.window));
  const sameWindow = bounds.every(({ start, end }) => start === bounds[0].start && end === bounds[0].end);
  return sameWindow ? candidates[0] : undefined;
}

/** Prefer a verified exact Cardmarket product match, then a documented expansion date. */
export function resolvePublicMarketReleaseDate(cardmarketProductId: number, expansionId: number): PublicMarketReleaseDate | null {
  const exactProduct = SEALED_RELEASES_V1.find((release) => (
    release.kind === 'sealed-product'
    && release.market === 'FR'
    && 'cardmarketProductId' in release
    && release.cardmarketProductId === cardmarketProductId
  ));
  if (exactProduct) return releaseDate(exactProduct, 'product');
  const expansion = expansionRelease(expansionId);
  return expansion ? releaseDate(expansion, 'expansion') : null;
}

export function formatPublicMarketReleaseDate(date: PublicMarketReleaseDate, language: SupportedLanguage): string {
  return formatReleaseWindow(date.window, language);
}

function releaseRows(releases: readonly SealedReleaseV1[], id: (release: SealedReleaseV1) => number | undefined): PublicMarketReleaseDateRow[] {
  return releases.flatMap((release) => {
    const catalogueId = id(release);
    if (catalogueId === undefined) return [];
    const { start, end } = getReleaseWindowBounds(release.window);
    return [{ id: catalogueId, start, end }];
  });
}

export function getPublicMarketProductReleaseDateRows(): PublicMarketReleaseDateRow[] {
  return releaseRows(SEALED_RELEASES_V1.filter((release) => (
    release.kind === 'sealed-product' && release.market === 'FR' && 'cardmarketProductId' in release
  )), (release) => 'cardmarketProductId' in release ? release.cardmarketProductId : undefined);
}

export function getPublicMarketExpansionReleaseDateRows(): PublicMarketReleaseDateRow[] {
  return Object.keys(EXPANSION_RELEASE_IDS).map(Number).flatMap((expansionId) => {
    const release = expansionRelease(expansionId);
    if (!release) return [];
    const { start, end } = getReleaseWindowBounds(release.window);
    return [{ id: expansionId, start, end }];
  });
}

function sqlDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid reviewed release date.');
  return `'${date}'::date`;
}

function sqlRows(kind: 'product' | 'expansion', rows: readonly PublicMarketReleaseDateRow[]): string[] {
  return rows.map(({ id, start, end }) => {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) throw new Error('Invalid reviewed catalogue ID.');
    return `('${kind}', ${id}, ${sqlDate(start)}, ${sqlDate(end)})`;
  });
}

/** SQL literals are generated only from the versioned, reviewed calendar above. */
export function publicMarketReleaseDateValuesSql(): string {
  return [
    ...sqlRows('product', getPublicMarketProductReleaseDateRows()),
    ...sqlRows('expansion', getPublicMarketExpansionReleaseDateRows()),
  ].join(',\n        ');
}
