import { describe, expect, it } from 'vitest';
import { buildTCGSetDisplayNames, getTCGSetIdentifiers } from './tcg-set-label';

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

  it('formats the TCGdex extension id and uses the official printed abbreviation', () => {
    expect(getTCGSetIdentifiers('me05')).toEqual({
      extensionId: 'ME5',
      printedCode: 'PBL',
    });
  });

  it('shows the printed 30C code only for 30th Celebration', () => {
    expect(getTCGSetIdentifiers('30th')).toEqual({ extensionId: '30TH', printedCode: '30C' });
    expect(getTCGSetIdentifiers('30th-c')).toEqual({ extensionId: '30TH-C' });
  });

  it('includes verified codes for modern special sets and promos', () => {
    expect(getTCGSetIdentifiers('mep')).toEqual({ extensionId: 'MEP', printedCode: 'MEP' });
    expect(getTCGSetIdentifiers('2023sv')).toEqual({ extensionId: '2023SV', printedCode: 'M23' });
    expect(getTCGSetIdentifiers('2024sv')).toEqual({ extensionId: '2024SV', printedCode: 'M24' });
    expect(getTCGSetIdentifiers('sv10.5b')).toEqual({ extensionId: 'SV10.5B', printedCode: 'BLK' });
  });

  it('omits old catalog abbreviations and digital-only sets without physical print codes', () => {
    expect(getTCGSetIdentifiers('base1')).toEqual({ extensionId: 'BASE1' });
    expect(getTCGSetIdentifiers('A1')).toEqual({ extensionId: 'A1' });
    expect(getTCGSetIdentifiers('mfb')).toEqual({ extensionId: 'MFB' });
    expect(getTCGSetIdentifiers('2018sm-fr')).toEqual({ extensionId: '2018SM-FR' });
    expect(getTCGSetIdentifiers('me02.5').extensionId).toBe('ME2.5');
  });
});
