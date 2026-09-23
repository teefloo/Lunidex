function normalizeCardName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function scriptGroup(character: string | undefined): string | null {
  if (!character) return null;
  if (/\p{Script=Latin}/u.test(character)) return 'latin';
  if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(character)) return 'cjk';
  if (/\p{Script=Hangul}/u.test(character)) return 'hangul';
  if (/\p{N}/u.test(character)) return 'number';
  return null;
}

function isNameBoundary(adjacent: string | undefined, nameEdge: string | undefined): boolean {
  if (!adjacent) return true;
  const adjacentScript = scriptGroup(adjacent);
  return adjacentScript === null || adjacentScript !== scriptGroup(nameEdge);
}

function containsWholePokemonName(cardTitle: string, pokemonName: string): boolean {
  let index = cardTitle.indexOf(pokemonName);
  while (index !== -1) {
    const before = index > 0 ? cardTitle[index - 1] : undefined;
    const afterIndex = index + pokemonName.length;
    const after = afterIndex < cardTitle.length ? cardTitle[afterIndex] : undefined;
    if (isNameBoundary(before, pokemonName[0]) && isNameBoundary(after, pokemonName[pokemonName.length - 1])) {
      return true;
    }
    index = cardTitle.indexOf(pokemonName, index + 1);
  }
  return false;
}

export function isPokemonNameInCardTitle(cardTitle: string, pokemonNames: readonly string[]): boolean {
  const normalizedTitle = normalizeCardName(cardTitle);
  if (!normalizedTitle) return false;

  return pokemonNames.some((name) => {
    const normalizedName = normalizeCardName(name);
    return normalizedName.length > 0 && containsWholePokemonName(normalizedTitle, normalizedName);
  });
}
