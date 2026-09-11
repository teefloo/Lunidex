export interface SealedCatalogueSearch {
  terms: string[];
  expansionId?: number;
}

export function getSealedCardmarketUrl(cardmarketProductId: number): string {
  return `https://www.cardmarket.com/fr/Pokemon/Products?idProduct=${cardmarketProductId}`;
}

export function getSealedImageCandidates(categoryId: number, cardmarketProductId: number): string[] {
  return ['jpg', 'png'].map((extension) => (
    `https://product-images.s3.cardmarket.com/${categoryId}/${cardmarketProductId}/${cardmarketProductId}.${extension}`
  ));
}

const EXPANSION_ALIASES = [
  { expansionId: 6569, aliases: ['ME05', 'ME 05', 'Nuit Noire', 'Pitch Black'] },
] as const;

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('fr-FR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function removePhrase(tokens: string[], phrase: string[]): void {
  for (let index = 0; index <= tokens.length - phrase.length;) {
    if (phrase.every((word, offset) => tokens[index + offset] === word)) {
      tokens.splice(index, phrase.length);
    } else {
      index += 1;
    }
  }
}

/** Parses catalogue terms and recognizes known expansion aliases. */
export function parseSealedCatalogueSearch(query: string): SealedCatalogueSearch {
  const normalized = normalizeSearch(query);
  const tokens = normalized ? normalized.split(' ') : [];
  const match = EXPANSION_ALIASES.find((extension) => extension.aliases.some((alias) => {
    const phrase = normalizeSearch(alias).split(' ');
    const words = normalized.split(' ');
    return phrase.length > 0 && words.some((_, index) => (
      phrase.every((word, offset) => words[index + offset] === word)
    ));
  }));

  if (!match) return { terms: tokens };
  for (const alias of match.aliases) removePhrase(tokens, normalizeSearch(alias).split(' '));
  return { expansionId: match.expansionId, terms: tokens };
}
