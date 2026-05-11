import { describe, expect, it } from 'vitest';
import { metadata as compareMetadata } from './compare/layout';
import { metadata as favoritesMetadata } from './favorites/layout';
import { metadata as privacyMetadata } from './privacy/layout';
import { metadata as quizMetadata } from './quiz/layout';
import { metadata as termsMetadata } from './terms/layout';

describe('route SEO metadata', () => {
  it('keeps public tool pages indexable with self canonicals', () => {
    expect(compareMetadata.alternates?.canonical).toBe('/compare');
    expect(compareMetadata.robots).toMatchObject({ index: true, follow: true });

    expect(quizMetadata.alternates?.canonical).toBe('/quiz');
    expect(quizMetadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('keeps private and legal pages accessible but out of the index', () => {
    expect(favoritesMetadata.alternates?.canonical).toBe('/favorites');
    expect(favoritesMetadata.robots).toMatchObject({ index: false, follow: true });

    expect(privacyMetadata.alternates?.canonical).toBe('/privacy');
    expect(privacyMetadata.robots).toMatchObject({ index: false, follow: true });

    expect(termsMetadata.alternates?.canonical).toBe('/terms');
    expect(termsMetadata.robots).toMatchObject({ index: false, follow: true });
  });
});
