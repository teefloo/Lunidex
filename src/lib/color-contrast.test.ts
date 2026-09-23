import { describe, expect, it } from 'vitest';
import { TYPE_COLORS } from '@/types/pokemon';
import { getReadableTextColor, getContrastRatio } from './color-contrast';

describe('Pokédex type filter text contrast', () => {
  it('chooses dark text for Electric and Ice, and light text for dark backgrounds', () => {
    expect(getReadableTextColor(TYPE_COLORS.electric)).toBe('#111111');
    expect(getReadableTextColor(TYPE_COLORS.ice)).toBe('#111111');
    expect(getReadableTextColor(TYPE_COLORS.ghost)).toBe('#ffffff');
  });

  it('keeps every Pokédex type color at WCAG AA contrast for normal text', () => {
    for (const color of Object.values(TYPE_COLORS)) {
      expect(getContrastRatio(getReadableTextColor(color), color)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
