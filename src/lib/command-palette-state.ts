export interface CommandPaletteEmptyStateInput {
  hasQuery: boolean;
  isFetching: boolean;
  resultCount: number;
}

export type CommandPaletteEmptyState = 'loading' | 'empty' | null;

export function getCommandPaletteEmptyState({
  hasQuery,
  isFetching,
  resultCount,
}: CommandPaletteEmptyStateInput): CommandPaletteEmptyState {
  if (!hasQuery) return null;
  if (isFetching) return 'loading';
  return resultCount === 0 ? 'empty' : null;
}
