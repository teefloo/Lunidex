import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDirectory = new URL('../public/', import.meta.url);
const source = fileURLToPath(new URL('brand/lunidex-mark-square.png', publicDirectory));

// Crop inside the existing blue tile to remove its outer transparent margin
// and rounded frame. This square still contains the mascot and every star.
const standardArtwork = await sharp(source)
  .extract({ left: 80, top: 80, width: 352, height: 352 })
  .removeAlpha()
  .png()
  .toBuffer();

// A wider crop keeps the entire mascot inside the 40% maskable safe circle.
// Extend only the tile's background into its transparent rounded corners:
// sample the blue pixels just inside each row's edge, away from the outline.
// The mascot and stars remain untouched, with no second frame or flat band.
const { data, info } = await sharp(source)
  .extract({ left: 45, top: 42, width: 423, height: 423 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Smooth background samples prevent the raster texture from becoming long
// horizontal streaks when a single edge pixel is extended across a corner.
const sampledBackground = await sharp(data, { raw: info }).blur(3).raw().toBuffer();

for (let y = 0; y < info.height; y++) {
  const offset = (x) => (y * info.width + x) * 4;
  let left = 0;
  let right = info.width - 1;
  while (left < right && data[offset(left) + 3] < 255) left++;
  while (right > left && data[offset(right) + 3] < 255) right--;
  if (right - left < 12) throw new Error(`No blue background to sample on row ${y}`);
  left += 6;
  right -= 6;
  for (let x = 0; x < info.width; x++) {
    const anchor = x < left ? left : x > right ? right : x;
    if (anchor !== x) {
      const sample = anchor === left ? left + 6 : right - 6;
      const blend = Math.min(Math.abs(x - anchor) / 6, 1);
      for (let channel = 0; channel < 3; channel++) {
        data[offset(x) + channel] = Math.round(
          data[offset(anchor) + channel] * (1 - blend)
          + sampledBackground[offset(sample) + channel] * blend,
        );
      }
    }
    data[offset(x) + 3] = 255;
  }
}

const maskableArtwork = await sharp(data, { raw: info })
  .removeAlpha()
  .png()
  .toBuffer();

const icons = [
  { filename: 'icon-192.png', size: 192 },
  { filename: 'icon-512.png', size: 512 },
  { filename: 'icon-512-maskable.png', size: 512, maskable: true },
  { filename: 'apple-touch-icon.png', size: 180 },
  { filename: 'favicon-32x32.png', size: 32 },
  { filename: 'favicon-16x16.png', size: 16 },
];

for (const { filename, size, maskable = false } of icons) {
  await sharp(maskable ? maskableArtwork : standardArtwork)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(filename, publicDirectory)));
  console.log(`Generated ${filename} (${size}x${size}, opaque)`);
}
