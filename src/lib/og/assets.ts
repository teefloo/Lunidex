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

export function isTrustedOgFontUrl(value: string): boolean {
  return isTrustedHttpsUrl(value, TRUSTED_OG_FONT_HOSTS);
}
