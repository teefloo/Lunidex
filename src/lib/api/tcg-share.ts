export interface TCGCollectionShareSettings {
  active: boolean;
  showQuantities: boolean;
  showPrices: boolean;
}

export interface TCGCollectionShareLink extends TCGCollectionShareSettings {
  url: string;
}

export interface TCGShowcasePrice {
  amount: number;
  currency: string;
  source: 'cardmarket' | 'tcgplayer';
  updatedAt: string | null;
}

export interface TCGShowcaseCard {
  id: string;
  language: TCGCardLanguage;
  name: string;
  localId: string | null;
  setName: string | null;
  image: string | null;
  quantity?: number;
  price?: TCGShowcasePrice | null;
}

export interface TCGShowcasePage {
  collection: { name: string; description: string };
  cards: TCGShowcaseCard[];
  page: number;
  pageSize: number;
  pageCount: number;
  totalCards: number;
  showQuantities: boolean;
  showPrices: boolean;
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`TCG share API returned ${response.status}`);
  return response.json() as Promise<T>;
}

function ownerSharePath(collectionId: string): string {
  return `/api/tcg/custom-collections/${encodeURIComponent(collectionId)}/share`;
}

export async function getTCGCollectionShareSettings(collectionId: string, signal?: AbortSignal): Promise<TCGCollectionShareSettings> {
  const response = await fetch(ownerSharePath(collectionId), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
    headers: { Accept: 'application/json' },
  });
  return readResponse<TCGCollectionShareSettings>(response);
}

export async function createTCGCollectionShareLink(collectionId: string, rotate: boolean): Promise<TCGCollectionShareLink> {
  const response = await fetch(ownerSharePath(collectionId), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ rotate }),
  });
  return readResponse<TCGCollectionShareLink>(response);
}

export async function updateTCGCollectionShareSettings(
  collectionId: string,
  settings: Pick<TCGCollectionShareSettings, 'showQuantities' | 'showPrices'>,
): Promise<TCGCollectionShareSettings> {
  const response = await fetch(ownerSharePath(collectionId), {
    method: 'PATCH',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return readResponse<TCGCollectionShareSettings>(response);
}

export async function revokeTCGCollectionShare(collectionId: string): Promise<TCGCollectionShareSettings> {
  const response = await fetch(ownerSharePath(collectionId), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  return readResponse<TCGCollectionShareSettings>(response);
}

export async function getTCGShowcasePage(token: string, page: number, signal?: AbortSignal): Promise<TCGShowcasePage> {
  const query = new URLSearchParams({ page: String(page) });
  const response = await fetch(`/api/tcg/showcase/${encodeURIComponent(token)}?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    signal,
    headers: { Accept: 'application/json' },
  });
  return readResponse<TCGShowcasePage>(response);
}
import type { TCGCardLanguage } from '@/types/tcg';
