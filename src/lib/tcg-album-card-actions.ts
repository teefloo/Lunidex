export type TCGAlbumCardPrimaryAction = 'add' | 'view';

export function getTCGAlbumCardPrimaryAction(owned: boolean): TCGAlbumCardPrimaryAction {
  return owned ? 'view' : 'add';
}

export function getTCGCardAccessibleName(name: string, localId: string): string {
  const collectorNumber = localId.trim();
  return collectorNumber ? `${name} #${collectorNumber}` : name;
}
