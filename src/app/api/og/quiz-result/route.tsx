import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { getServerTForLanguage } from '@/lib/server-i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { loadOgFonts } from '@/lib/og/fonts';
import { OG_SIZE, OG_THEME } from '@/lib/og/theme';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';

const CHALLENGE_COLORS: Record<string, string> = {
  classic: '#4A90D9',
  silhouette: '#9B59B6',
  stats: '#27AE60',
};

const CHALLENGE_LABELS: Record<string, string> = {
  classic: 'Classic',
  silhouette: 'Silhouette',
  stats: 'Stats',
};

const MODE_LABELS: Record<string, string> = {
  marathon: 'Marathon',
  survival: 'Survival',
  'time-attack': 'Time Attack',
};

function clampScore(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;

  const score = clampScore(search.get('score'), 0, 0, 999);
  const total = clampScore(search.get('total'), 10, 1, 999);
  const mode = search.get('mode') ?? 'marathon';
  const challenge = search.get('challenge') ?? 'classic';
  const streak = clampScore(search.get('streak'), 0, 0, 999);
  const badgesEarned = clampScore(search.get('badges'), 0, 0, 99);
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';
  const t = getServerTForLanguage(lang);

  const challengeColor = CHALLENGE_COLORS[challenge] ?? CHALLENGE_COLORS.classic;
  const challengeLabel = t(`quiz.${challenge}`, { defaultValue: CHALLENGE_LABELS[challenge] ?? challenge });
  const modeLabel = t(`quiz.${mode}`, { defaultValue: MODE_LABELS[mode] ?? mode });
  const correctLabel = t('quiz.correct', { defaultValue: 'Correct' });
  const streakLabel = t('quiz.streak', { defaultValue: 'Streak' });
  const badgesLabel = t('quiz.achievements', { defaultValue: 'Badges' });
  const host = new URL(SITE_URL).host;

  const subsetText = [
    'Lunidex',
    String(score),
    String(total),
    challengeLabel,
    modeLabel,
    correctLabel,
    streakLabel,
    badgesLabel,
    host,
  ].join(' ');
  const fonts = await loadOgFonts(lang, subsetText);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: '40px',
          background: `linear-gradient(135deg, ${challengeColor}22 0%, ${OG_THEME.background} 55%, ${OG_THEME.surfaceMuted} 100%)`,
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
                fontSize: '40px',
                color: OG_THEME.text,
                textTransform: 'uppercase',
              }}
            >
              {t('quiz.title', { defaultValue: "Who's That Pokémon?" })}
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

          {/* Score */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '48px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '120px',
                  lineHeight: 1,
                  color: challengeColor,
                }}
              >
                {score}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Pixelify Sans',
                  fontSize: '56px',
                  color: OG_THEME.textDim,
                }}
              >
                /{total}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: OG_THEME.textMuted,
                marginTop: '8px',
              }}
            >
              {correctLabel}
            </div>
          </div>

          {/* Mode + Challenge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: OG_THEME.surfaceMuted,
                border: `3px solid ${OG_THEME.border}`,
                padding: '10px 20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '14px',
                  height: '14px',
                  background: challengeColor,
                  border: `2px solid ${OG_THEME.shadow}`,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: OG_THEME.text,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {challengeLabel}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: OG_THEME.surfaceMuted,
                border: `3px solid ${OG_THEME.border}`,
                padding: '10px 20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: OG_THEME.text,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {modeLabel}
              </div>
            </div>
          </div>

          {/* Footer: streak + badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: 'auto',
            }}
          >
            {/* Streak */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                {streakLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '72px',
                    lineHeight: 1,
                    color: streak > 0 ? '#F59E0B' : OG_THEME.textDim,
                  }}
                >
                  {streak}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
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
                {badgesLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '72px',
                    lineHeight: 1,
                    color: badgesEarned > 0 ? OG_THEME.primary : OG_THEME.textDim,
                  }}
                >
                  {badgesEarned}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );
}
