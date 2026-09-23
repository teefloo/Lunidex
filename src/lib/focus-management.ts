export interface FocusTrapState {
  backwards: boolean;
  focusIsInside: boolean;
  focusIsFirst: boolean;
  focusIsLast: boolean;
  focusableCount: number;
}

export type FocusTrapTarget = 'first' | 'last' | null;

export function getFocusTrapTarget(state: FocusTrapState): FocusTrapTarget {
  if (state.focusableCount < 1) return null;
  if (state.backwards && (!state.focusIsInside || state.focusIsFirst)) return 'last';
  if (!state.backwards && (!state.focusIsInside || state.focusIsLast)) return 'first';
  return null;
}

export function shouldFocusPokedexSearchOnSlash({
  searchIsFocused,
  targetIsEditable,
}: {
  searchIsFocused: boolean;
  targetIsEditable: boolean;
}): boolean {
  return !searchIsFocused && !targetIsEditable;
}
