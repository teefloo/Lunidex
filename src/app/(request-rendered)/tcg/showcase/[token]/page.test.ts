import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

const mocks = vi.hoisted(() => ({ language: 'fr' }));

vi.mock('@/lib/server-i18n', () => ({
  getServerLanguage: async () => mocks.language,
  getServerT: async () => (key: string) => key,
}));
vi.mock('@/components/tcg/TCGCollectionShowcasePage', () => ({
  TCGCollectionShowcasePage: () => null,
}));

import { generateMetadata } from './page';

describe('TCG collection showcase metadata', () => {
  beforeEach(() => {
    mocks.language = 'fr';
  });

  it('uses the requested locale and the same public showcase path for alternates', async () => {
    const token = 'A'.repeat(43);
    const path = `/tcg/showcase/${token}`;
    const metadata = await generateMetadata({ params: Promise.resolve({ token }) });

    expect(metadata.alternates).toEqual({
      canonical: `/fr${path}`,
      languages: buildSubpathLanguages(path),
    });
    expect(metadata.openGraph).toMatchObject({
      url: `/fr${path}`,
      images: [DEFAULT_OG_IMAGE],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [DEFAULT_OG_IMAGE],
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
