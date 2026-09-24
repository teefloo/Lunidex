export type TCGAlbumCardPrimaryAction = 'add' | 'view';

export function getTCGAlbumCardPrimaryAction(owned: boolean): TCGAlbumCardPrimaryAction {
  return owned ? 'view' : 'add';
}
