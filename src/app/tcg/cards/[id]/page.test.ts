import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ card: vi.fn() }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardCached: mocks.card }));
vi.mock('@/lib/server-i18n', () => ({ getServerLanguage: async () => 'fr', getServerT: async () => (key: string) => key }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/tcg/TCGCardDetailRoute', () => ({ TCGCardDetailRoute: () => null }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('HTTP 404'); } }));
import CardPage, { generateMetadata } from './page';

function props(id: string, tcgLang?: string) {
  return { params: Promise.resolve({ id }), searchParams: Promise.resolve({ tcgLang }) };
}
describe('public card canonical routing', () => {
  beforeEach(() => {
    mocks.card.mockImplementation((id: string, lang: string) => Promise.resolve(
      id === 'base1-4' || (id === 'PMCG1-001' && lang === 'ja') ? { id, name: 'Charizard', localId: '4' } : null,
    ));
  });
  it('keeps English default URLs identical with and without the query', async () => {
    const clean = await generateMetadata(props('base1-4'));
    expect(clean).toEqual(await generateMetadata(props('base1-4', 'en')));
    expect(clean.alternates?.canonical).toBe('/fr/tcg/cards/base1-4');
  });
  it('resolves a regional card canonical with the same data language', async () => {
    const metadata = await generateMetadata(props('PMCG1-001', 'ja'));
    expect(metadata.alternates?.canonical).toBe('/fr/tcg/cards/PMCG1-001?tcgLang=ja');
    expect(metadata.alternates?.languages).toMatchObject({ ja: '/ja/tcg/cards/PMCG1-001?tcgLang=ja' });
    expect(metadata.openGraph).toMatchObject({ url: '/fr/tcg/cards/PMCG1-001?tcgLang=ja' });
    expect(await CardPage(props('PMCG1-001', 'ja'))).toBeTruthy();
  });
});
