import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ gallery: vi.fn(), language: vi.fn(), translate: vi.fn() }));

vi.mock('@/lib/tcg-illustrator-gallery', () => ({ loadTCGIllustratorGallery: mocks.gallery }));
vi.mock('@/lib/server-i18n', () => ({ getServerLanguage: mocks.language, getServerT: mocks.translate }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/tcg/TCGIllustratorPageClient', () => ({ TCGIllustratorPageClient: () => null }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('HTTP 404'); } }));

import IllustratorPage, { generateMetadata } from './page';

const gallery = {
  artist: 'Shinji Kanda',
  identity: 'shinji kanda',
  language: 'en' as const,
  cards: [{ id: 'swsh11-186', name: 'Giratina V' }],
  total: 38,
  page: 2,
  pageCount: 2,
  hasUnavailableDetails: false,
  isUnavailable: false,
};

function props(page?: string) {
  return {
    params: Promise.resolve({ artist: 'Shinji Kanda' }),
    searchParams: Promise.resolve({ tcgLang: 'en', page }),
  };
}

describe('TCG illustrator page metadata and routing', () => {
  beforeEach(() => {
    mocks.gallery.mockReset();
    mocks.language.mockResolvedValue('fr');
    mocks.translate.mockResolvedValue((key: string, values?: Record<string, string | number>) => {
      if (key === 'tcg.illustrator_meta_title') return `${values?.artist} | Lunidex`;
      if (key === 'tcg.illustrator_meta_description') return `${values?.count} cards illustrated by ${values?.artist}`;
      if (key === 'tcg.illustrator_meta_description_unavailable') return `Cards by ${values?.artist} are temporarily unavailable`;
      return key;
    });
  });

  it('uses a stable artist canonical and includes the requested page in metadata', async () => {
    mocks.gallery.mockResolvedValue({ ...gallery, page: 2 });
    const metadata = await generateMetadata(props('2'));

    expect(metadata.alternates?.canonical).toBe('/fr/tcg/illustrators/shinji%20kanda?page=2');
    expect(metadata.alternates?.languages?.en).toBe('/en/tcg/illustrators/shinji%20kanda?page=2');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('decodes percent-encoded artist segments retained by Next route params', async () => {
    mocks.gallery.mockImplementation(async (artist: string) => artist === 'shinji kanda' ? gallery : null);
    const encodedProps = {
      ...props(),
      params: Promise.resolve({ artist: 'shinji%20kanda' }),
    };

    const metadata = await generateMetadata(encodedProps);

    expect(mocks.gallery).toHaveBeenNthCalledWith(1, 'shinji%20kanda', 'en', 1);
    expect(mocks.gallery).toHaveBeenNthCalledWith(2, 'shinji kanda', 'en', 1);
    expect(metadata.alternates?.canonical).toBe('/fr/tcg/illustrators/shinji%20kanda');
  });

  it('keeps a known artist page with no cards in this language out of search indexes', async () => {
    mocks.gallery.mockResolvedValue({ ...gallery, cards: [], total: 0, pageCount: 0 });
    const metadata = await generateMetadata(props());

    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it('does not describe a temporary catalog failure as an empty artist page', async () => {
    mocks.gallery.mockResolvedValue({ ...gallery, cards: [], total: 0, pageCount: 0, isUnavailable: true });

    const metadata = await generateMetadata(props());

    expect(metadata.description).toBe('Cards by Shinji Kanda are temporarily unavailable');
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it('returns 404 for an unknown artist and a page beyond the final result page', async () => {
    mocks.gallery.mockResolvedValue(null);
    await expect(IllustratorPage(props())).rejects.toThrow('HTTP 404');

    mocks.gallery.mockResolvedValue({ ...gallery, page: 3 });
    await expect(IllustratorPage(props('3'))).rejects.toThrow('HTTP 404');
  });
});
