import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrustedOgFontUrl } from '@/lib/og/assets';
import type { SupportedLanguage } from '@/lib/languages';

/**
 * Font loading for `next/og` (satori). Satori only accepts static TTF/OTF/WOFF
 * buffers — never WOFF2 or variable fonts — so the Soft Pixel brand faces
 * (Pixelify Sans / Nunito) are vendored as static TTFs next to this module and
 * read from the traced project-relative path, with a `new URL(..., import.meta.url)`
 * fallback for development. The URL references make the bundler emit the assets
 * and have @vercel/nft trace them into the function.
 *
 * The OG routes run on the Node.js runtime (not edge): the edge bundle of
 * `next/og` + satori + the vendored faces exceeds the 1 MB edge function size
 * limit, whereas the Node serverless function has ample headroom.
 *
 * NOTE: the optional CJK fallback uses `fetch` purely to load a *font* subset
 * (not application data), which is the standard ImageResponse pattern and sits
 * outside the "no direct data fetch beyond @/lib/api" rule. It is best-effort:
 * if the network is unavailable the image still renders with the Latin faces.
 */

export type OgFontWeight = 400 | 700 | 800;

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: OgFontWeight;
  style: 'normal';
}

let brandFontsPromise: Promise<OgFont[]> | null = null;

const PIXELIFY_FONT_URL = new URL('./fonts/PixelifySans-Bold.ttf', import.meta.url);
const NUNITO_FONT_URL = new URL('./fonts/Nunito-Bold.ttf', import.meta.url);
const NUNITO_EXTRA_BOLD_FONT_URL = new URL('./fonts/Nunito-ExtraBold.ttf', import.meta.url);

async function readFontFile(url: URL, fileName: string): Promise<Buffer | null> {
  const candidates = [
    // Webpack rewrites `new URL()` font imports to /_next/static paths. The
    // traced source file is still present in the Node function bundle, so use
    // the project-relative path first in production.
    join(process.cwd(), 'src/lib/og/fonts', fileName),
    ...(url.protocol === 'file:' ? [fileURLToPath(url)] : []),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // Try the next traced/bundled location.
    }
  }

  return null;
}

/** Buffer → standalone ArrayBuffer slice (avoids a shared-pool offset). */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function loadBrandFonts(): Promise<OgFont[]> {
  const [pixelify, nunito, nunitoExtra] = await Promise.all([
    readFontFile(PIXELIFY_FONT_URL, 'PixelifySans-Bold.ttf'),
    readFontFile(NUNITO_FONT_URL, 'Nunito-Bold.ttf'),
    readFontFile(NUNITO_EXTRA_BOLD_FONT_URL, 'Nunito-ExtraBold.ttf'),
  ]);
  return [
    pixelify && { name: 'Pixelify Sans', data: toArrayBuffer(pixelify), weight: 700, style: 'normal' as const },
    nunito && { name: 'Nunito', data: toArrayBuffer(nunito), weight: 700, style: 'normal' as const },
    nunitoExtra && { name: 'Nunito', data: toArrayBuffer(nunitoExtra), weight: 800, style: 'normal' as const },
  ].filter((font): font is OgFont => Boolean(font));
}

// Google Fonts serves static TTFs (rather than WOFF2) to legacy user agents.
const LEGACY_TTF_UA =
  'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

const CJK_FAMILY: Partial<Record<SupportedLanguage, string>> = {
  ja: 'Noto Sans JP',
  ko: 'Noto Sans KR',
  zh: 'Noto Sans SC',
};

const MAX_CJK_FONT_BYTES = 8 * 1024 * 1024;

async function loadCjkFont(lang: SupportedLanguage, text: string): Promise<OgFont | null> {
  const family = CJK_FAMILY[lang];
  if (!family || !text.trim()) return null;

  try {
    const cssUrl =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@700` +
      `&text=${encodeURIComponent(text)}`;
    const cssResponse = await fetch(cssUrl, { headers: { 'User-Agent': LEGACY_TTF_UA } });
    if (!cssResponse.ok) return null;

    const css = await cssResponse.text();
    const rawFontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!rawFontUrl) return null;

    const fontUrl = new URL(rawFontUrl, cssUrl).toString();
    if (!isTrustedOgFontUrl(fontUrl)) return null;

    const fontResponse = await fetch(fontUrl);
    if (!fontResponse.ok) return null;

    const contentLength = Number(fontResponse.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_CJK_FONT_BYTES) return null;

    const data = await fontResponse.arrayBuffer();
    if (data.byteLength > MAX_CJK_FONT_BYTES) return null;
    return { name: 'Noto CJK', data, weight: 700, style: 'normal' };
  } catch {
    return null;
  }
}

/**
 * Returns the satori font set for an OG image. Latin brand faces are always
 * included; when the locale is CJK a glyph-subsetted Noto face for exactly the
 * rendered `text` is appended so satori can fall back to it for missing glyphs.
 */
export async function loadOgFonts(lang: SupportedLanguage, text: string): Promise<OgFont[]> {
  if (!brandFontsPromise) brandFontsPromise = loadBrandFonts();
  const brand = await brandFontsPromise;
  const cjk = await loadCjkFont(lang, text);
  return cjk ? [...brand, cjk] : brand;
}
