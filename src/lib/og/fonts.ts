import type { SupportedLanguage } from '@/lib/languages';

/**
 * Font loading for `next/og` (satori). Satori only accepts static TTF/OTF/WOFF
 * buffers — never WOFF2 or variable fonts — so the Soft Pixel brand faces
 * (Pixelify Sans / Nunito) are vendored as static TTFs next to this module and
 * loaded with `fetch(new URL('./fonts/...', import.meta.url))`. That pattern
 * makes the bundler emit the asset alongside the route chunk and works in the
 * edge runtime used by the OG routes (where `fs` is unavailable).
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

async function loadBrandFonts(): Promise<OgFont[]> {
  const [pixelify, nunito, nunitoExtra] = await Promise.all([
    fetch(new URL('./fonts/PixelifySans-Bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('./fonts/Nunito-Bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('./fonts/Nunito-ExtraBold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Pixelify Sans', data: pixelify, weight: 700, style: 'normal' },
    { name: 'Nunito', data: nunito, weight: 700, style: 'normal' },
    { name: 'Nunito', data: nunitoExtra, weight: 800, style: 'normal' },
  ];
}

// Google Fonts serves static TTFs (rather than WOFF2) to legacy user agents.
const LEGACY_TTF_UA =
  'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

const CJK_FAMILY: Partial<Record<SupportedLanguage, string>> = {
  ja: 'Noto Sans JP',
  ko: 'Noto Sans KR',
  zh: 'Noto Sans SC',
};

async function loadCjkFont(lang: SupportedLanguage, text: string): Promise<OgFont | null> {
  const family = CJK_FAMILY[lang];
  if (!family || !text.trim()) return null;

  try {
    const cssUrl =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@700` +
      `&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, { headers: { 'User-Agent': LEGACY_TTF_UA } }).then((res) =>
      res.text(),
    );
    const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!fontUrl) return null;

    const data = await fetch(fontUrl).then((res) => res.arrayBuffer());
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
