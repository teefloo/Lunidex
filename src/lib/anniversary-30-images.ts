/**
 * Official 30th Celebration card art is served from this English-only gallery
 * CDN. The same assets are used in both the English and French experiences.
 */
const OFFICIAL_GALLERY_ASSET_PATH = 'https://dz3we2x72f7ol.cloudfront.net/expansions/30th-celebration/en-us';

function getGalleryAssetUrl(fileName: string): string {
  return `${OFFICIAL_GALLERY_ASSET_PATH}/${fileName}-2x.png`;
}

export function getAnniversary30OfficialCardImage(input: {
  scope: 'numbered-main' | 'secret-rare' | 'pikachu';
  localId: string;
} | {
  scope: 'classic-collection';
  imageIndex: number;
}): string {
  if (input.scope === 'classic-collection') {
    return getGalleryAssetUrl(`2M6P_Classic_EN_${input.imageIndex}`);
  }

  const normalizedLocalId = input.localId.replace(/^0+/, '') || '0';
  return getGalleryAssetUrl(`2M6P_EN_${Number(normalizedLocalId)}`);
}
