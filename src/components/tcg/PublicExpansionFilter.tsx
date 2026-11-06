'use client';

import { useState } from 'react';
import { findPublicExpansionId, type PublicExpansionOption } from '@/lib/tcg-sealed-public-market';

export function PublicExpansionFilter({
  options,
  selectedId,
  label,
  emptyLabel,
  hintId,
}: {
  options: readonly PublicExpansionOption[];
  selectedId?: number;
  label: string;
  emptyLabel: string;
  hintId: string;
}) {
  const selected = options.find((option) => option.id === selectedId);
  const [searchText, setSearchText] = useState(selected?.label ?? (selectedId === undefined ? '' : `#${selectedId}`));
  const [resolvedId, setResolvedId] = useState<number | undefined>(selectedId);

  return <label className="space-y-1 text-xs font-bold text-foreground/65">
    <span>{label}</span>
    <input
      type="search"
      list="sealed-market-expansion-options"
      value={searchText}
      onChange={(event) => {
        const value = event.currentTarget.value;
        setSearchText(value);
        setResolvedId(findPublicExpansionId(value, options));
      }}
      placeholder={emptyLabel}
      aria-describedby={hintId}
      aria-autocomplete="list"
      className="glass-control h-11 w-full px-3 text-sm"
    />
    <input type="hidden" name="expansion" value={resolvedId ?? ''} />
    <datalist id="sealed-market-expansion-options">
      {options.map((option) => <option key={option.id} value={option.label} />)}
    </datalist>
  </label>;
}
