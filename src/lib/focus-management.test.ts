import { describe, expect, it } from 'vitest';
import { getFocusTrapTarget, shouldFocusPokedexSearchOnSlash } from './focus-management';

describe('focus management helpers', () => {
  it('wraps Tab and Shift+Tab at the edges of a modal', () => {
    expect(getFocusTrapTarget({ backwards: false, focusIsInside: true, focusIsFirst: false, focusIsLast: true, focusableCount: 3 })).toBe('first');
    expect(getFocusTrapTarget({ backwards: true, focusIsInside: true, focusIsFirst: true, focusIsLast: false, focusableCount: 3 })).toBe('last');
    expect(getFocusTrapTarget({ backwards: false, focusIsInside: true, focusIsFirst: false, focusIsLast: false, focusableCount: 3 })).toBeNull();
  });

  it('keeps focus in the modal when it starts outside the focusable controls', () => {
    expect(getFocusTrapTarget({ backwards: true, focusIsInside: false, focusIsFirst: false, focusIsLast: false, focusableCount: 2 })).toBe('last');
    expect(getFocusTrapTarget({ backwards: false, focusIsInside: false, focusIsFirst: false, focusIsLast: false, focusableCount: 2 })).toBe('first');
  });

  it('does not steal slash from editable fields or the command palette', () => {
    expect(shouldFocusPokedexSearchOnSlash({ searchIsFocused: false, targetIsEditable: true })).toBe(false);
    expect(shouldFocusPokedexSearchOnSlash({ searchIsFocused: true, targetIsEditable: false })).toBe(false);
    expect(shouldFocusPokedexSearchOnSlash({ searchIsFocused: false, targetIsEditable: false })).toBe(true);
  });
});
