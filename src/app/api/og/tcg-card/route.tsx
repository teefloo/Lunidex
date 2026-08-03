import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { getTCGCard } from '@/lib/api';
import { getTCGCardPngImage } from '@/lib/tcg-images';
import { getServerTForLanguage } from '@/lib/server-i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { loadOgFonts } from '@/lib/og/fonts';
import { OG_SIZE, OG_THEME } from '@/lib/og/theme';
import { SITE_URL } from '@/lib/site';

// Node.js runtime: the edge bundle (next/og + satori + vendored fonts) exceeds
// the 1 MB edge function size limit; the Node serverless function has headroom.
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;
  const id = search.get('id') ?? '';
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';
  const t = getServerTForLanguage(lang);

  const card = id ? await getTCGCard(id, lang).catch(() => null) : null;

  const name = card?.name ?? 'Lunidex';
  const rarity = card?.rarity ?? '';
  const setName = card?.set?.name ?? '';
  const imageUrl = card ? (getTCGCardPngImage(card) ?? '') : '';
  const rarityLabel = t('tcg.rarity');
  const host = new URL(SITE_URL).host;

  const subsetText = [name, rarity, setName, rarityLabel, host, 'Lunidex'].join(' ');
  const fonts = await loadOgFonts(lang, subsetText);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: '40px',
          background: `linear-gradient(135deg, ${OG_THEME.backgroundAccent} 0%, ${OG_THEME.background} 55%, ${OG_THEME.surfaceMuted} 100%)`,
          fontFamily: 'Nunito',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: 1,
            background: OG_THEME.surface,
            border: `6px solid ${OG_THEME.borderStrong}`,
            boxShadow: `12px 12px 0 ${OG_THEME.shadow}`,
            padding: '40px 48px',
          }}
        >
          {/* Card artwork */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '360px',
              height: '100%',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires a raw img element, not next/image
              <img
                src={imageUrl}
                alt={name}
                width={326}
                height={455}
                style={{
                  objectFit: 'contain',
                  border: `5px solid ${OG_THEME.border}`,
                  boxShadow: `8px 8px 0 ${OG_THEME.shadow}`,
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '326px',
                  height: '455px',
                  background: OG_THEME.surfaceMuted,
                  border: `5px solid ${OG_THEME.border}`,
                  fontFamily: 'Pixelify Sans',
                  fontSize: '120px',
                  color: OG_THEME.textDim,
                }}
              >
                ?
              </div>
            )}
          </div>

          {/* Text column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              paddingLeft: '48px',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: OG_THEME.primary,
                color: OG_THEME.background,
                border: `4px solid ${OG_THEME.borderStrong}`,
                boxShadow: `4px 4px 0 ${OG_THEME.shadow}`,
                padding: '6px 16px',
                fontFamily: 'Pixelify Sans',
                fontSize: '26px',
                alignSelf: 'flex-start',
              }}
            >
              Lunidex
            </div>

            <div
              style={{
                display: 'flex',
                fontFamily: 'Pixelify Sans',
                fontSize: '64px',
                lineHeight: 1.05,
                color: OG_THEME.text,
                marginTop: '24px',
              }}
            >
              {name}
            </div>

            {rarity ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '28px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: OG_THEME.textMuted,
                  }}
                >
                  {rarityLabel}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignSelf: 'flex-start',
                    marginTop: '8px',
                    background: OG_THEME.accent,
                    color: '#16202b',
                    border: `4px solid ${OG_THEME.shadow}`,
                    padding: '6px 18px',
                    fontSize: '28px',
                    fontWeight: 800,
                  }}
                >
                  {rarity}
                </div>
              </div>
            ) : null}

            {setName ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '24px',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: OG_THEME.textMuted,
                }}
              >
                {setName}
              </div>
            ) : null}
          </div>

          {/* Host watermark */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              right: '48px',
              display: 'flex',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '2px',
              color: OG_THEME.textDim,
            }}
          >
            {host}
          </div>
        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );
}
