import { ImageResponse } from 'next/og';
import { getPokemonDetail, getPokemonSpecies } from '@/lib/api';
import { getBaseSpeciesName } from '@/lib/form-names';
import { formatPokemonSlugName } from '@/lib/utils';

export const runtime = 'edge';
export const alt = 'Pokémon Details — PrimeDex';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

export default async function Image({ params }: { params: { name: string } }) {
  const name = params.name;

  try {
    const baseName = getBaseSpeciesName(name);
    const [pokemon, species] = await Promise.all([
      getPokemonDetail(name),
      getPokemonSpecies(baseName).catch(() => null),
    ]);
    const baseLocalizedName = species?.names?.find((entry) => entry.language.name === 'en')?.name
      || baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const displayName = name.includes('-') ? formatPokemonSlugName(name) : baseLocalizedName;
    const artwork = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    const mainType = pokemon.types[0].type.name;
    const mainColor = TYPE_COLORS[mainType] || '#A8A77A';
    const totalStats = pokemon.stats.reduce((sum: number, s: { base_stat: number }) => sum + s.base_stat, 0);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            background: `linear-gradient(135deg, #1a1a2e 0%, ${mainColor}33 50%, #1a1a2e 100%)`,
            fontFamily: 'sans-serif',
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
                color: 'rgba(255, 255, 255, 0.4)',
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
                color: 'white',
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
                    background: TYPE_COLORS[typeItem.type.name] || '#888',
                    color: 'white',
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
                color: 'rgba(255, 255, 255, 0.5)',
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
                background: 'linear-gradient(135deg, #e94560, #ff8a00)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              PrimeDex
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
      { ...size }
    );
  } catch {
    // Fallback OG image if pokemon fetch fails
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              fontWeight: 900,
              color: 'white',
              display: 'flex',
            }}
          >
            PrimeDex
          </div>
        </div>
      ),
      { ...size }
    );
  }
}
