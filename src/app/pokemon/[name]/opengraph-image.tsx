import { ImageResponse } from 'next/og';
import { getPokemonDetailCached as getPokemonDetail, getPokemonFormCached as getPokemonForm, getPokemonSpeciesCached as getPokemonSpecies } from '@/lib/api/server-cache';
import { getBaseSpeciesName, getPokemonDisplayName } from '@/lib/form-names';
import { loadDefaultOgImage } from '@/lib/og/default-image';
import { loadOgFonts } from '@/lib/og/fonts';
import { OG_SIZE, OG_THEME, OG_TYPE_COLORS } from '@/lib/og/theme';

export const runtime = 'nodejs';
export const alt = 'Pokémon Details — Lunidex';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  try {
    const pokemon = await getPokemonDetail(name);
    const baseName = pokemon.species?.name || getBaseSpeciesName(name);
    const [species, form] = await Promise.all([
      getPokemonSpecies(baseName).catch(() => null),
      getPokemonForm(name).catch(() => null),
    ]);
    const baseLocalizedName = species?.names?.find((entry) => entry.language.name === 'en')?.name
      || baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const displayName = getPokemonDisplayName({ name, baseLocalizedName, baseSpeciesName: baseName, lang: 'en', form });
    const artwork = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    const mainType = pokemon.types[0].type.name;
    const mainColor = OG_TYPE_COLORS[mainType] || OG_THEME.border;
    const totalStats = pokemon.stats.reduce((sum: number, s: { base_stat: number }) => sum + s.base_stat, 0);
    const fonts = await loadOgFonts('en', `${displayName} Lunidex BST ${totalStats}`);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            background: `linear-gradient(135deg, ${OG_THEME.backgroundAccent} 0%, ${mainColor}33 50%, ${OG_THEME.background} 100%)`,
            fontFamily: 'Nunito',
            position: 'relative',
          }}
        >
          {/* Radial glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '25%',
              transform: 'translate(50%, -50%)',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${mainColor}40 0%, transparent 70%)`,
              display: 'flex',
            }}
          />

          {/* Left content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px',
              flex: 1,
              position: 'relative',
              zIndex: 10,
            }}
          >
            {/* ID badge */}
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: OG_THEME.textDim,
                letterSpacing: '4px',
                marginBottom: '8px',
                display: 'flex',
              }}
            >
              #{String(pokemon.id).padStart(4, '0')}
            </div>

            {/* Name */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: OG_THEME.text,
                letterSpacing: '-3px',
                lineHeight: 1,
                marginBottom: '16px',
                display: 'flex',
              }}
            >
              {displayName}
            </div>

            {/* Types */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {pokemon.types.map((typeItem: { type: { name: string } }) => (
                <div
                  key={typeItem.type.name}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    background: OG_TYPE_COLORS[typeItem.type.name] || OG_THEME.border,
                    color: OG_THEME.background,
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                  }}
                >
                  {typeItem.type.name}
                </div>
              ))}
            </div>

            {/* Stats summary */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: OG_THEME.textMuted,
                display: 'flex',
                gap: '16px',
              }}
            >
              <span style={{ display: 'flex' }}>BST: {totalStats}</span>
              <span style={{ display: 'flex' }}>Height: {pokemon.height / 10}m</span>
              <span style={{ display: 'flex' }}>Weight: {pokemon.weight / 10}kg</span>
            </div>

            {/* Branding */}
            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '60px',
                fontSize: '20px',
                fontWeight: 900,
                color: OG_THEME.primary,
                display: 'flex',
              }}
            >
              Lunidex
            </div>
          </div>

          {/* Right artwork */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '450px',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {artwork && (
              <img
                src={artwork}
                alt={displayName}
                width={380}
                height={380}
                style={{
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
                }}
              />
            )}
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  } catch {
    // Fallback OG image if pokemon fetch fails
    const image = await loadDefaultOgImage();
    return new ImageResponse(
      <img src={image} alt={alt} width={size.width} height={size.height} style={{ objectFit: 'cover' }} />,
      { ...size }
    );
  }
}
