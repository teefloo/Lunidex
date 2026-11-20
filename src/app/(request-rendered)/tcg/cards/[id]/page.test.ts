import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ card: vi.fn(), detailRoute: vi.fn((props: unknown) => { void props; return null; }) }));
vi.mock('@/lib/api/server-cache', () => ({ getTCGCardCached: mocks.card }));
vi.mock('@/lib/server-i18n', () => ({ getServerLanguage: async () => 'fr', getServerT: async () => (key: string) => key }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/tcg/TCGCardDetailRoute', () => ({ TCGCardDetailRoute: mocks.detailRoute }));
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

  it('renders localized card data and the query return path through the dynamic page', async () => {
    const card = {
      id: 'PMCG1-001',
      name: 'Pikachu',
      localId: '001',
      set: { id: 'PMCG1', name: 'Promos' },
    };
    mocks.card.mockResolvedValue(card);

    const markup = renderToStaticMarkup(await CardPage({
      params: Promise.resolve({ id: card.id }),
      searchParams: Promise.resolve({ tcgLang: 'ja', from: '/fr/tcg?set=PMCG1' }),
    }));

    expect(markup).toContain('Pikachu');
    expect(mocks.card).toHaveBeenCalledWith(card.id, 'ja');
    expect(mocks.detailRoute.mock.calls.at(-1)?.[0]).toMatchObject({
      card,
      tcgLanguage: 'ja',
      returnHref: '/fr/tcg?set=PMCG1',
    });
  });
});
