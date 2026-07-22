import { readFile } from 'node:fs/promises';

const DEFAULT_OG_IMAGE_PATH = new URL('./assets/primedex-og.jpg', import.meta.url);

let defaultOgImagePromise: Promise<string> | null = null;

/**
 * Loads the selected PrimeDex OG artwork as a data URI for next/og.
 * Keeping the asset beside the server-side OG code lets the bundler trace it
 * into the generated route instead of relying on a self-fetch to public/.
 */
export function loadDefaultOgImage(): Promise<string> {
  if (!defaultOgImagePromise) {
    defaultOgImagePromise = readFile(DEFAULT_OG_IMAGE_PATH).then(
      (image) => `data:image/jpeg;base64,${image.toString('base64')}`,
    );
  }

  return defaultOgImagePromise;
}
