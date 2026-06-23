import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { getPokemonDetail } from '@/lib/api';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { loadOgFonts } from '@/lib/og/fonts';
import { OG_SIZE, OG_THEME, OG_TYPE_COLORS } from '@/lib/og/theme';
import { SITE_URL } from '@/lib/site';
import type { PokemonDetail } from '@/types/pokemon';

// Node.js runtime: the edge bundle (next/og + satori + vendored fonts) exceeds
// the 1 MB edge function size limit; the Node serverless function has headroom.
export const runtime = 'nodejs';

function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

function artworkUrl(pokemon: PokemonDetail): string {
  return (
    pokemon.sprites.other?.['official-artwork']?.front_default ||
    pokemon.sprites.front_default ||
    ''
  );
}

function totalStats(pokemon: PokemonDetail): number {
  return pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;
  const name = search.get('name') ?? '';
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';

  const pokemon = name ? await getPokemonDetail(name).catch(() => null) : null;

  const displayName = pokemon
    ? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
    : 'PrimeDex';
  const dexNumber = pokemon ? formatDexNumber(pokemon.id) : '';
  const types = pokemon?.types.map((ty) => ty.type.name) ?? [];
  const bst = pokemon ? totalStats(pokemon) : 0;
  const imageUrl = pokemon ? artworkUrl(pokemon) : '';
  const host = new URL(SITE_URL).host;

  const subsetText = [displayName, dexNumber, host, 'PrimeDex', 'BST']
    .concat(types)
    .join(' ');
  const fonts = await loadOgFonts(lang, subsetText);

  const primaryType = types[0] ?? 'normal';
  const typeColor = OG_TYPE_COLORS[primaryType] ?? OG_THEME.primary;

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
          {/* Pokemon artwork */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '400px',
              height: '100%',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires raw <img>, not next/image
              <img
                src={imageUrl}
                alt={displayName}
                width={360}
                height={360}
                style={{
                  objectFit: 'contain',
                  border: `5px solid ${typeColor}`,
                  boxShadow: `8px 8px 0 ${OG_THEME.shadow}`,
                  background: OG_THEME.surfaceMuted,
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '360px',
                  height: '360px',
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
            {/* Branding */}
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
              PrimeDex
            </div>

            {/* Pokemon number */}
            {dexNumber ? (
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '32px',
                  color: typeColor,
                  marginTop: '20px',
                  letterSpacing: '2px',
                }}
              >
                {dexNumber}
              </div>
            ) : null}

            {/* Pokemon name */}
            <div
              style={{
                display: 'flex',
                fontFamily: 'Pixelify Sans',
                fontSize: '64px',
                lineHeight: 1.05,
                color: OG_THEME.text,
                marginTop: '4px',
              }}
            >
              {displayName}
            </div>

            {/* Type badges */}
            {types.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                {types.map((typeName) => {
                  const color = OG_TYPE_COLORS[typeName] ?? OG_THEME.border;
                  return (
                    <div
                      key={typeName}
                      style={{
                        display: 'flex',
                        background: color,
                        color: '#1b1410',
                        border: `3px solid ${OG_THEME.shadow}`,
                        padding: '6px 18px',
                        fontSize: '22px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {typeName}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Base stat total */}
            {bst > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: '28px',
                }}
              >
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
                  BST
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'Pixelify Sans',
                      fontSize: '72px',
                      lineHeight: 1,
                      color: OG_THEME.accent,
                    }}
                  >
                    {bst}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'Pixelify Sans',
                      fontSize: '28px',
                      color: OG_THEME.textDim,
                    }}
                  >
                    /720
                  </div>
                </div>
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
