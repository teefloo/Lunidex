import { describe, expect, it } from 'vitest';
import { formatReleaseWindow, type ReleaseWindow } from './tcg-release-calendar';

describe('formatReleaseWindow', () => {
  it('renders an exact date in the requested locale without timezone drift', () => {
    const release: ReleaseWindow = { precision: 'day', date: '2026-11-06' };
    expect(formatReleaseWindow(release, 'fr')).toBe('6 novembre 2026');
    expect(formatReleaseWindow(release, 'en')).toBe('November 6, 2026');
  });

  it('keeps a quarter imprecise rather than inventing a release day', () => {
    const release: ReleaseWindow = { precision: 'quarter', year: 2026, quarter: 4 };
    expect(formatReleaseWindow(release, 'fr')).toBe('4e trimestre 2026');
    expect(formatReleaseWindow(release, 'en')).toBe('Q4 2026');
  });
});
