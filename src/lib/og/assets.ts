const TRUSTED_OG_IMAGE_HOSTS = new Set([
  'assets.pokemon.com',
  'raw.githubusercontent.com',
  'assets.tcgdex.net',
  'images.tcgdex.net',
  'images.scrydex.com',
  'images.pokemontcg.io',
]);

const TRUSTED_OG_FONT_HOSTS = new Set(['fonts.gstatic.com']);
const MAX_REMOTE_ASSET_URL_LENGTH = 2048;
const MAX_OG_IMAGE_BYTES = 2 * 1024 * 1024;
const OG_IMAGE_FETCH_TIMEOUT_MS = 2500;

const pendingOgImageLoads = new Map<string, Promise<string>>();

function isTrustedHttpsUrl(value: string, hosts: ReadonlySet<string>): boolean {
  if (value.length > MAX_REMOTE_ASSET_URL_LENGTH) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && hosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Only allow known upstream image hosts into server-rendered OG markup. */
export function getTrustedOgImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return isTrustedHttpsUrl(value, TRUSTED_OG_IMAGE_HOSTS) ? value : '';
}

function detectOgImageMimeType(contentType: string | null, data: Uint8Array): 'image/png' | 'image/jpeg' | null {
  const isPng = data.length >= 8
    && data[0] === 0x89
    && data[1] === 0x50
    && data[2] === 0x4e
    && data[3] === 0x47
    && data[4] === 0x0d
    && data[5] === 0x0a
    && data[6] === 0x1a
    && data[7] === 0x0a;
  if (isPng) return 'image/png';

  const isJpeg = data.length >= 3
    && data[0] === 0xff
    && data[1] === 0xd8
    && data[2] === 0xff;
  if (isJpeg) return 'image/jpeg';

  const normalizedContentType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  return normalizedContentType === 'image/png' || normalizedContentType === 'image/jpeg'
    ? normalizedContentType
    : null;
}

function encodeBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function fetchOgImageDataUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'image/png,image/jpeg;q=0.9,*/*;q=0.1' },
      signal: controller.signal,
    });
    if (!response.ok) return '';

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_OG_IMAGE_BYTES) return '';

    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length === 0 || data.length > MAX_OG_IMAGE_BYTES) return '';

    const mimeType = detectOgImageMimeType(response.headers.get('content-type'), data);
    return mimeType ? `data:${mimeType};base64,${encodeBase64(data)}` : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert a trusted remote image into a self-describing PNG/JPEG data URL.
 * `next/og` can reject an otherwise valid remote asset when its upstream MIME
 * type is temporarily missing; embedding validated bytes makes that failure a
 * local fallback instead of a 500 response.
 */
export async function loadTrustedOgImageDataUrl(value: string | null | undefined): Promise<string> {
  const trustedUrl = getTrustedOgImageUrl(value);
  if (!trustedUrl || trustedUrl.startsWith('/')) return trustedUrl;

  const pending = pendingOgImageLoads.get(trustedUrl);
  if (pending) return pending;

  const request = fetchOgImageDataUrl(trustedUrl);
  pendingOgImageLoads.set(trustedUrl, request);
  try {
    return await request;
  } finally {
    if (pendingOgImageLoads.get(trustedUrl) === request) {
      pendingOgImageLoads.delete(trustedUrl);
    }
  }
}

/** Try resilient image candidates until one can be decoded by `next/og`. */
export async function loadFirstTrustedOgImageDataUrl(
  values: readonly (string | null | undefined)[],
): Promise<string> {
  for (const value of values) {
    const loaded = await loadTrustedOgImageDataUrl(value);
    if (loaded) return loaded;
  }
  return '';
}

export function isTrustedOgFontUrl(value: string): boolean {
  return isTrustedHttpsUrl(value, TRUSTED_OG_FONT_HOSTS);
}
