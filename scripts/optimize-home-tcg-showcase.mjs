import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const showcaseDirectory = path.resolve(scriptDirectory, '../public/tcg-showcase');
const responsiveDirectory = path.join(showcaseDirectory, 'responsive');
const targetWidth = 384;
const webpQuality = 76;
const responsiveWidths = [160, 256];

await mkdir(responsiveDirectory, { recursive: true });

const files = (await readdir(showcaseDirectory))
  .filter((file) => file.endsWith('.webp'))
  .sort();

if (files.length === 0) {
  throw new Error(`No WebP showcase assets found in ${showcaseDirectory}.`);
}

let optimizedCount = 0;
let bytesSaved = 0;
let responsiveVariantsWritten = 0;
let responsiveBytesWritten = 0;

for (const file of files) {
  const assetPath = path.join(showcaseDirectory, file);
  const original = await readFile(assetPath);
  const metadata = await sharp(original).metadata();

  if (typeof metadata.width !== 'number') continue;

  let sourceForVariants = original;
  if (metadata.width > targetWidth) {
    const optimized = await sharp(original)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: webpQuality, effort: 6 })
      .toBuffer();

    if (optimized.length < original.length) {
      await writeFile(assetPath, optimized);
      sourceForVariants = optimized;
      optimizedCount += 1;
      bytesSaved += original.length - optimized.length;
      process.stdout.write(`${file}: ${original.length} -> ${optimized.length} bytes\n`);
    }
  }

  for (const width of responsiveWidths) {
    const responsivePath = path.join(responsiveDirectory, file.replace('.webp', `-${width}.webp`));
    const responsive = await sharp(sourceForVariants)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: webpQuality, effort: 6 })
      .toBuffer();

    await writeFile(responsivePath, responsive);
    responsiveVariantsWritten += 1;
    responsiveBytesWritten += responsive.length;
  }
}

process.stdout.write(
  `Optimized ${optimizedCount} base assets; saved ${bytesSaved} bytes. `
  + `Wrote ${responsiveVariantsWritten} responsive variants (${responsiveBytesWritten} bytes total).\n`,
);
