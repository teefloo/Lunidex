import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { getTCGSetCached } from '@/lib/api/server-cache';
import { getServerTForLanguage } from '@/lib/server-i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { getTrustedOgImageUrl } from '@/lib/og/assets';
import { loadOgFonts } from '@/lib/og/fonts';
import { normalizeOgTcgSetId, sanitizeOgText } from '@/lib/og/input';
import { OG_SIZE, OG_THEME } from '@/lib/og/theme';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<ImageResponse> {
  const search = request.nextUrl.searchParams;
  const id = normalizeOgTcgSetId(search.get('set'));
  const langParam = search.get('lang') ?? 'en';
  const lang: SupportedLanguage = isSupportedLanguage(langParam) ? langParam : 'en';
  const t = getServerTForLanguage(lang);
  const set = id ? await getTCGSetCached(id, lang).catch(() => null) : null;

  const name = sanitizeOgText(set?.name ?? null, 'Pokémon TCG set', 80);
  const total = set?.cardCount?.total ?? set?.totalCards ?? 0;
  const releaseDate = sanitizeOgText(set?.releaseDate ?? null, '', 32);
  const imageUrl = set ? getTrustedOgImageUrl(getTCGSetImageCandidates(set)[0]) : '';
  const title = t('tcg.set_meta_title', { name, releaseDate: releaseDate || '?' });
  const label = t('tcg.set_landing_checklist', { defaultValue: 'Pokémon TCG set checklist' });
  const host = new URL(SITE_URL).host;
  const subsetText = [name, title, label, releaseDate, host, 'Lunidex'].join(' ');
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
            alignItems: 'center',
            gap: '48px',
            background: OG_THEME.surface,
            border: `6px solid ${OG_THEME.borderStrong}`,
            boxShadow: `12px 12px 0 ${OG_THEME.shadow}`,
            padding: '48px 56px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '320px',
              height: '320px',
              flexShrink: 0,
              background: OG_THEME.surfaceMuted,
              border: `5px solid ${OG_THEME.border}`,
              boxShadow: `8px 8px 0 ${OG_THEME.shadow}`,
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- satori requires a raw img element.
              <img src={imageUrl} alt={name} width={280} height={280} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', fontFamily: 'Pixelify Sans', fontSize: '120px', color: OG_THEME.textDim }}>✦</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: OG_THEME.primary,
                color: OG_THEME.background,
                border: `4px solid ${OG_THEME.borderStrong}`,
                boxShadow: `4px 4px 0 ${OG_THEME.shadow}`,
                padding: '6px 16px',
                fontFamily: 'Pixelify Sans',
                fontSize: '24px',
              }}
            >
              Lunidex
            </div>
            <div style={{ display: 'flex', marginTop: '26px', fontFamily: 'Pixelify Sans', fontSize: '58px', lineHeight: 1.05, color: OG_THEME.text }}>
              {name}
            </div>
            <div style={{ display: 'flex', marginTop: '24px', fontSize: '25px', fontWeight: 800, color: OG_THEME.textMuted }}>
              {label}
            </div>
            {total > 0 ? (
              <div style={{ display: 'flex', marginTop: '14px', fontSize: '22px', color: OG_THEME.textDim }}>
                {t('tcg.activation.card_total', { count: total })}
                {releaseDate ? ` · ${releaseDate}` : ''}
              </div>
            ) : null}
          </div>

          <div style={{ position: 'absolute', bottom: '28px', right: '48px', display: 'flex', fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: OG_THEME.textDim }}>
            {host}
          </div>
        </div>
      </div>
    ),
    { width: OG_SIZE.width, height: OG_SIZE.height, fonts },
  );
}
