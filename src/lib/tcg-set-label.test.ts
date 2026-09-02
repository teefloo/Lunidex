import { describe, expect, it } from 'vitest';
import { buildTCGSetDisplayNames } from './tcg-set-label';

describe('TCG set option labels', () => {
  it('keeps unique names concise and disambiguates duplicate localized names', () => {
    const labels = buildTCGSetDisplayNames([
      { id: 'me03', name: 'Équilibre Parfait' },
      { id: 'sv1a', name: 'Triplet Beat' },
      { id: 'sv1b', name: 'Triplet Beat' },
    ]);

    expect(labels.get('me03')).toBe('Équilibre Parfait');
    expect(labels.get('sv1a')).toBe('Triplet Beat (sv1a)');
    expect(labels.get('sv1b')).toBe('Triplet Beat (sv1b)');
  });

  it('uses the set id when a malformed set name is empty', () => {
    const labels = buildTCGSetDisplayNames([{ id: 'sv1a', name: '   ' }]);

    expect(labels.get('sv1a')).toBe('sv1a');
  });
});
