import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_OG_IMAGE_PATH = join(process.cwd(), 'public', 'og', 'lunidex-og.jpg');

let defaultOgImagePromise: Promise<string> | null = null;

/**
 * Loads the selected Lunidex OG artwork as a data URI for next/og.
 * The public asset is part of the deployment and reading it locally avoids a
 * network self-fetch while the route is statically rendered.
 */
export function loadDefaultOgImage(): Promise<string> {
  if (!defaultOgImagePromise) {
    defaultOgImagePromise = readFile(DEFAULT_OG_IMAGE_PATH).then(
      (image) => `data:image/jpeg;base64,${image.toString('base64')}`,
    );
  }

  return defaultOgImagePromise;
}
