import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { getPokemonDetail, getTypeRelations, type TypeRelations } from '@/lib/api';
import { analyzeTeam, calculateSynergyScore } from '@/lib/team-analysis';
import { getServerTForLanguage } from '@/lib/server-i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { getTrustedOgImageUrl } from '@/lib/og/assets';
import { loadOgFonts } from '@/lib/og/fonts';
import { OG_SIZE, OG_THEME, OG_TYPE_COLORS, synergyColor } from '@/lib/og/theme';
import { SITE_URL } from '@/lib/site';
import type { PokemonDetail } from '@/types/pokemon';

// Node.js runtime: the edge bundle (next/og + satori + vendored fonts) exceeds
// the 1 MB edge function size limit; the Node serverless function has headroom.
export const runtime = 'nodejs';

const MAX_TEAM_QUERY_LENGTH = 128;
const MAX_POKEMON_ID = 1025;

// NOTE: satori (next/og) renders a stray black rectangle at the SVG origin when
// `box-shadow` or `position: absolute` is used inside a `flex-direction: column`
// container (as in this layout). The Soft Pixel look here therefore relies on
// sharp corners + thick borders only; the TCG card OG (a row layout) keeps the
// offset shadows safely.

// Accepts the existing share encoding `?code=25-6-9` and also `?ids=25,6,9`.
function parseTeamIds(raw: string | null): number[] {
  if (!raw || raw.length > MAX_TEAM_QUERY_LENGTH) return [];
  return raw
    .split(/[-,]/)
    .map((value) => value.trim())
    .filter((value) => /^\d{1,4}$/.test(value))
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0 && id <= MAX_POKEMON_ID)
    .slice(0, 6);
}

function spriteUrl(pokemon: PokemonDetail): string {
  return (
    pokemon.sprites.front_default ||
    pokemon.sprites.other['official-artwork'].front_default ||
    ''
  );
}

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;
  const ids = parseTeamIds(search.get('code') ?? search.get('ids'));
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';
  const t = getServerTForLanguage(lang);

  // All Pokémon data flows through the @/lib/api barrel.
  const team = (
    await Promise.all(ids.map((id) => getPokemonDetail(String(id)).catch(() => null)))
  ).filter((pokemon): pokemon is PokemonDetail => pokemon !== null);

  // analyzeTeam only reads relations for the types the team actually carries.
  const teamTypes = [...new Set(team.flatMap((p) => p.types.map((ty) => ty.type.name)))];
  const relationEntries = await Promise.all(
    teamTypes.map(async (typeName) => {
      try {
        return [typeName, await getTypeRelations(typeName)] as const;
      } catch {
        return null;
      }
    }),
  );
  const relations: Record<string, TypeRelations> = {};
  for (const entry of relationEntries) {
    if (entry) relations[entry[0]] = entry[1];
  }

  const analysis = team.length > 0 ? analyzeTeam(team, relations) : null;
  const synergy = analysis ? calculateSynergyScore(team, analysis) : 0;
  const coveredTypes = analysis ? [...analysis.typeCoverage] : [];

  const title = t('team.title');
  const synergyLabel = t('team.synergy');
  const coverageLabel = t('team.type_coverage');
  const emptyLabel = t('team.no_pokemon');
  const typeLabels = coveredTypes.map((ty) => ({
    key: ty,
    label: t(`types.${ty}`, { defaultValue: ty }),
  }));
  const host = new URL(SITE_URL).host;

  const subsetText = [title, synergyLabel, coverageLabel, emptyLabel, host, 'Lunidex']
    .concat(typeLabels.map((ty) => ty.label))
    .join(' ');
  const fonts = await loadOgFonts(lang, subsetText);

  const slots = Array.from({ length: 6 }, (_, index) => team[index] ?? null);

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
        {/* Bordered Soft Pixel panel with offset shadow */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            background: OG_THEME.surface,
            border: `6px solid ${OG_THEME.borderStrong}`,
            padding: '44px 48px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: OG_THEME.primary,
                color: OG_THEME.background,
                border: `4px solid ${OG_THEME.borderStrong}`,
                padding: '6px 16px',
                fontFamily: 'Pixelify Sans',
                fontSize: '30px',
                letterSpacing: '1px',
              }}
            >
              Lunidex
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Pixelify Sans',
                fontSize: '46px',
                color: OG_THEME.text,
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: 'flex',
                marginLeft: 'auto',
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '2px',
                color: OG_THEME.textDim,
              }}
            >
              {host}
            </div>
          </div>

          {/* Sprite row */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '36px' }}>
            {slots.map((pokemon, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '156px',
                  height: '156px',
                  background: pokemon ? OG_THEME.surfaceMuted : OG_THEME.backgroundAccent,
                  border: `4px solid ${pokemon ? OG_THEME.border : OG_THEME.surfaceMuted}`,
                }}
              >
                {pokemon && getTrustedOgImageUrl(spriteUrl(pokemon)) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- satori (next/og) requires a raw img element, not next/image
                  <img
                    src={getTrustedOgImageUrl(spriteUrl(pokemon))}
                    alt={pokemon.name}
                    width={132}
                    height={132}
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: 'Pixelify Sans',
                      fontSize: '54px',
                      color: OG_THEME.textDim,
                    }}
                  >
                    ?
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer: synergy + covered types */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: 'auto',
            }}
          >
            {team.length > 0 ? (
              <>
                {/* Synergy badge */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '20px',
                      fontWeight: 800,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: OG_THEME.textMuted,
                    }}
                  >
                    {synergyLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Pixelify Sans',
                        fontSize: '92px',
                        lineHeight: 1,
                        color: synergyColor(synergy),
                      }}
                    >
                      {synergy}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'Pixelify Sans',
                        fontSize: '34px',
                        color: OG_THEME.textDim,
                      }}
                    >
                      /100
                    </div>
                  </div>
                </div>

                {/* Covered types */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    maxWidth: '620px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '20px',
                      fontWeight: 800,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: OG_THEME.textMuted,
                      marginBottom: '12px',
                    }}
                  >
                    {coverageLabel} · {coveredTypes.length}/18
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {typeLabels.map((ty) => (
                      <div
                        key={ty.key}
                        style={{
                          display: 'flex',
                          background: OG_TYPE_COLORS[ty.key] ?? OG_THEME.border,
                          color: '#1b1410',
                          border: `3px solid ${OG_THEME.shadow}`,
                          padding: '4px 12px',
                          fontSize: '18px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {ty.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '40px',
                  color: OG_THEME.textDim,
                }}
              >
                {emptyLabel}
              </div>
            )}
          </div>

        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );
}
