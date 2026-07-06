import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

export const runtime = 'edge';
export const alt = 'PrimeDex — The Ultimate Online Pokédex';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #e94560 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(233, 69, 96, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Pokéball silhouette */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            border: '8px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '80px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #ffffff 0%, #e94560 50%, #ff8a00 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-4px',
              display: 'flex',
            }}
          >
            PrimeDex
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '6px',
              textTransform: 'uppercase',
              marginTop: '12px',
              display: 'flex',
            }}
          >
            The Ultimate Pokédex
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            {['1025 Pokémon', 'Team Builder', 'Type Chart', 'Quiz'].map((label) => (
              <div
                key={label}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '2px',
            display: 'flex',
          }}
        >
          {new URL(SITE_URL).host}
        </div>
      </div>
    ),
    { ...size }
  );
}
