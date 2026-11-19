import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getServerTForLanguage } from '@/lib/server-i18n';
import { buildTcgSetSitemapEntries } from '@/lib/sitemap';

const mocks = vi.hoisted(() => ({ set: vi.fn(), cards: vi.fn(), locale: 'en' }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGSetCached: mocks.set, getTCGSetCardsCached: mocks.cards }));
vi.mock('@/lib/server-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/server-i18n')>(),
  getServerLanguage: () => Promise.resolve(mocks.locale),
  getServerT: () => Promise.resolve(getServerTForLanguage(mocks.locale as 'en')),
}));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/share/ShareButton', () => ({ ShareButton: () => null }));
vi.mock('@/components/tcg/TCGImageWithFallback', () => ({ TCGImageWithFallback: () => null }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('HTTP 404'); } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactElement; href: string }) => createElement('a', { href }, children) }));

import SetPage, { generateMetadata } from './page';

const set = { id: 'base1', name: 'Base Set', releaseDate: '1999-01-09', cardCount: { total: 1, official: 1 } };
const cards = [{ id: 'base1-4', name: 'Charizard', localId: '4' }];
function props(setId = 'base1', tcgLang?: string | string[]) {
  return { params: Promise.resolve({ setId }), searchParams: Promise.resolve({ tcgLang }) };
}

describe('public set routing and canonical metadata', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.locale = 'en';
    mocks.set.mockImplementation((id: string, lang: string) => Promise.resolve(
      id === 'base1' || (id === 'PMCG1' && lang === 'ja') ? { ...set, id } : null,
    ));
    mocks.cards.mockResolvedValue(cards);
  });

  it.each(['en', 'fr', 'de', 'ja', 'zh'])('renders a valid set without a language query in %s', async locale => {
    mocks.locale = locale;
    const clean = await generateMetadata(props());
    const explicit = await generateMetadata(props('base1', 'en'));
    expect(clean).toEqual(explicit);
    expect(clean.alternates?.canonical).toBe(`/${locale}/tcg/sets/base1`);
    expect(clean.robots).toMatchObject({ index: true });
    expect(await SetPage(props())).toBeTruthy();
    expect(buildTcgSetSitemapEntries([set], locale as 'en')[0]?.url).toBe(`https://lunidex.app/${locale}/tcg/sets/base1`);
  });

  it.each(['set', 'cards'] as const)('propagates a temporary %s failure instead of returning 404/noindex', async loader => {
    const unavailable = new Error('TCGdex temporarily unavailable');
    mocks[loader].mockRejectedValue(unavailable);
    await expect(generateMetadata(props())).rejects.toBe(unavailable);
    await expect(SetPage(props())).rejects.toBe(unavailable);
  });

  it('keeps a regional-only set canonical resolvable with its data language', async () => {
    mocks.locale = 'fr';
    const metadata = await generateMetadata(props('PMCG1', 'ja'));
    const canonical = String(metadata.alternates?.canonical);
    expect(canonical).toBe('/fr/tcg/sets/PMCG1?tcgLang=ja');
    expect(metadata.openGraph).toMatchObject({ url: canonical });
    expect(metadata.alternates?.languages).toMatchObject({
      fr: canonical, en: '/en/tcg/sets/PMCG1?tcgLang=ja', 'x-default': '/en/tcg/sets/PMCG1?tcgLang=ja',
    });
    const url = new URL(canonical, 'https://lunidex.app');
    const page = await SetPage(props(url.pathname.split('/').at(-1), url.searchParams.get('tcgLang') ?? undefined));
    expect(renderToStaticMarkup(page)).toContain('https://lunidex.app/fr/tcg/sets/PMCG1?tcgLang=ja');
  });

  it('normalizes repeated and invalid language queries consistently', async () => {
    const repeated = await generateMetadata(props('base1', ['fr', 'en']));
    expect(repeated.alternates?.canonical).toBe('/en/tcg/sets/base1?tcgLang=fr');
    const invalid = await generateMetadata(props('base1', 'fr-FR'));
    expect(invalid.alternates?.canonical).toBe('/en/tcg/sets/base1');
  });

  it('keeps unknown IDs as real missing pages', async () => {
    await expect(SetPage(props('missing-set'))).rejects.toThrow('HTTP 404');
  });
});
