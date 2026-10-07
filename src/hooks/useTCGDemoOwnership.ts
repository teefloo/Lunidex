'use client';

import { useCallback, useMemo, useState } from 'react';

export interface TCGDemoOwnership {
  ownedIds: ReadonlySet<string>;
  toggleOwned: (cardId: string) => void;
}

const EMPTY_IDS: ReadonlySet<string> = new Set();

/** Ephemeral album state. Changing set/language or authenticating discards it. */
export function useTCGDemoOwnership(scope: string | null): TCGDemoOwnership | undefined {
  const [state, setState] = useState({ scope, ownedIds: EMPTY_IDS });
  if (state.scope !== scope) setState({ scope, ownedIds: EMPTY_IDS });

  const toggleOwned = useCallback((cardId: string) => {
    if (scope === null) return;
    setState((previous) => {
      const ownedIds = new Set(previous.scope === scope ? previous.ownedIds : EMPTY_IDS);
      if (ownedIds.has(cardId)) ownedIds.delete(cardId);
      else ownedIds.add(cardId);
      return { scope, ownedIds };
    });
  }, [scope]);

  return useMemo(() => scope === null ? undefined : {
    ownedIds: state.scope === scope ? state.ownedIds : EMPTY_IDS,
    toggleOwned,
  }, [scope, state, toggleOwned]);
}
