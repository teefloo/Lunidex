import type { TCGCustomCollectionCardDetail } from '@/lib/api/tcg';
import type { TCGCustomCollectionLayoutCardRef } from '@primedex/core/lib/tcg-custom-collections';

function cardReferenceKey(ref: Pick<TCGCustomCollectionLayoutCardRef, 'cardId' | 'language'>): string {
  return `${ref.language}:${ref.cardId.toLocaleLowerCase()}`;
}

/** Format every physical pocket from the saved binder order, independent of the active page or filters. */
export function formatTCGCustomCollectionCopyText(
  savedOrder: readonly TCGCustomCollectionLayoutCardRef[],
  details: readonly TCGCustomCollectionCardDetail[],
): string {
  const detailsByRef = new Map(details.map((detail) => [cardReferenceKey(detail.ref), detail]));
  const lines: string[] = [];

  for (const slotRun of savedOrder) {
    const detail = detailsByRef.get(cardReferenceKey(slotRun));
    const cardId = slotRun.cardId;
    const name = detail?.unavailable
      ? detail.ref.cardName || cardId
      : detail?.card.name?.trim() || detail?.ref.cardName || cardId;
    const setId = detail?.card.set?.id?.trim();
    const localId = detail?.card.localId?.trim()
      || cardId.slice(cardId.lastIndexOf('-') + 1)
      || cardId;
    const officialTotal = detail?.card.set?.cardCount?.official;
    const setTotal = Number.isSafeInteger(officialTotal) && (officialTotal ?? 0) > 0
      ? officialTotal
      : detail?.card.set?.cardCount?.total;
    const setPart = setId ? ` ${setId.toUpperCase()}` : '';
    const numberPart = Number.isSafeInteger(setTotal) && (setTotal ?? 0) > 0 ? `/${setTotal}` : '';
    const formatted = `${name}${setPart} ${localId}${numberPart}`;

    for (let copy = 0; copy < (slotRun.copyCount ?? 1); copy += 1) lines.push(formatted);
  }

  return lines.join(', ');
}
