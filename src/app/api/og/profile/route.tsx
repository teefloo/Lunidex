import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { loadOgFonts } from '@/lib/og/fonts';
import { MAX_OG_TRAINER_NAME_LENGTH, parseOgInteger, sanitizeOgText } from '@/lib/og/input';
import { OG_SIZE, OG_THEME } from '@/lib/og/theme';
import { SITE_URL } from '@/lib/site';

// Node.js runtime: the edge bundle (next/og + satori + vendored fonts) exceeds
// the 1 MB edge function size limit; the Node serverless function has headroom.
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;

  const trainer = sanitizeOgText(search.get('trainer'), 'Trainer', MAX_OG_TRAINER_NAME_LENGTH);
  const level = parseOgInteger(search.get('level'), 1, 1, 100);
  const badgeCount = parseOgInteger(search.get('badges'), 0, 0, 999);
  const caughtPercent = parseOgInteger(search.get('caught'), 0, 0, 100);
  const quizBest = parseOgInteger(search.get('quiz'), 0, 0, 9999);
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';

  const host = new URL(SITE_URL).host;

  const subsetText = [trainer, 'Lunidex', 'Trainer', 'Level', 'Badges', 'Dex', 'Quiz', host].join(
    ' ',
  );
  const fonts = await loadOgFonts(lang, subsetText);

  // XP bar gradient: colour changes with level bracket
  const levelColor =
    level >= 25 ? '#F59E0B' : level >= 15 ? '#6FBF73' : level >= 8 ? '#A8C5E0' : OG_THEME.primary;

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
            flexDirection: 'column',
            flex: 1,
            background: OG_THEME.surface,
            border: `6px solid ${OG_THEME.borderStrong}`,
            padding: '44px 56px',
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

          {/* Trainer name + level */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: OG_THEME.textMuted,
              }}
            >
              Trainer
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Pixelify Sans',
                fontSize: '80px',
                lineHeight: 1.0,
                color: OG_THEME.text,
                marginTop: '4px',
              }}
            >
              {trainer}
            </div>
          </div>

          {/* Level badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: `${levelColor}22`,
                border: `4px solid ${levelColor}`,
                padding: '12px 28px',
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
                Level
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '72px',
                  lineHeight: 1,
                  color: levelColor,
                }}
              >
                {level}
              </div>
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                flex: 1,
                paddingLeft: '16px',
              }}
            >
              {/* Badges */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: OG_THEME.textMuted,
                  }}
                >
                  Badges
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '52px',
                    lineHeight: 1,
                    color: badgeCount > 0 ? OG_THEME.primary : OG_THEME.textDim,
                  }}
                >
                  {badgeCount}
                </div>
              </div>

              {/* Quiz best */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: OG_THEME.textMuted,
                  }}
                >
                  Quiz Best
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '52px',
                    lineHeight: 1,
                    color: quizBest > 0 ? OG_THEME.accent : OG_THEME.textDim,
                  }}
                >
                  {quizBest}
                </div>
              </div>
            </div>
          </div>

          {/* Caught % bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
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
                Dex Completion
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '32px',
                  color: OG_THEME.primary,
                }}
              >
                {caughtPercent}%
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '20px',
                background: OG_THEME.surfaceMuted,
                border: `3px solid ${OG_THEME.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: `${caughtPercent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${OG_THEME.primary}, ${OG_THEME.accent})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );
}
