import { ImageResponse } from 'next/og';
import { loadDefaultOgImage } from '@/lib/og/default-image';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = DEFAULT_OG_IMAGE.alt;
export const size = { width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height };
export const contentType = 'image/png';

export default async function Image() {
  const image = await loadDefaultOgImage();

  return new ImageResponse(
    <img src={image} alt={alt} width={size.width} height={size.height} style={{ objectFit: 'cover' }} />,
    { ...size }
  );
}
