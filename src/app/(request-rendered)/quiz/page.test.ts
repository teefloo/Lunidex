// @vitest-environment jsdom
import { act, createElement, type HTMLAttributes, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphQLPokemonSearchIndex } from '@/types/pokemon';

const mocks = vi.hoisted(() => ({ index: vi.fn(), detail: vi.fn(), toast: vi.fn() }));
const state = { quizHighScores: { classic: 0, silhouette: 0, stats: 0 }, updateQuizHighScore: vi.fn(), addBadge: vi.fn(), badges: [], addQuizSession: vi.fn(), addAction: vi.fn() };
vi.mock('@/store/primedex', () => ({ usePrimeDexStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock('@/lib/api', () => ({ getAllPokemonSearchIndex: mocks.index, getPokemonDetail: mocks.detail, getPokemonByGeneration: vi.fn(), getPokemonByType: vi.fn() }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/toast', () => ({ toast: { error: mocks.toast } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en' }));
vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/layout/PageHeader', () => ({ default: () => null }));
vi.mock('@/components/dashboard/QuizLeaderboard', () => ({ default: () => null }));
vi.mock('@/components/quiz/QuizResultCard', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/supabase/leaderboard-client', () => ({ answerDailyQuizQuestion: vi.fn(), startDailyQuizAttempt: vi.fn(), submitDailyAttempt: vi.fn() }));
vi.mock('framer-motion', () => {
  const element = (tag: string) => function MotionElement({ children, className, onClick, style, disabled }: HTMLAttributes<HTMLElement> & { disabled?: boolean }) {
    return createElement(tag, { className, onClick, style, disabled }, children);
  };
  function AnimatePresence({ children }: { children: ReactNode }) { return children; }
  return { motion: { div: element('div'), span: element('span'), button: element('button') }, AnimatePresence };
});
import QuizPage from './page';
import { pokemonKeys } from '@/lib/api/keys';
const index: GraphQLPokemonSearchIndex[] = ['pikachu', 'bulbasaur', 'charmander', 'squirtle'].map((name, position) => ({ id: position + 1, name, pokemon_v2_pokemonspecy: null }));

describe('quiz initial data readiness', () => {
  let container: HTMLDivElement; let root: Root; let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.detail.mockResolvedValue({
      id: 25,
      name: 'pikachu',
      stats: Array.from({ length: 6 }, (_, index) => ({ base_stat: index })),
      sprites: { front_default: '', other: { 'official-artwork': { front_default: '' } } },
      types: [],
    });
  });
  afterEach(() => { act(() => root.unmount()); client.clear(); container.remove(); });
  const classic = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'quiz.classic')!;
  async function render() { await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(QuizPage))); }); }
  it('prevents an early start until the index arrives, then starts without a false empty-pool error', async () => {
    let resolveIndex!: (value: GraphQLPokemonSearchIndex[]) => void;
    mocks.index.mockReturnValue(new Promise<GraphQLPokemonSearchIndex[]>(resolve => { resolveIndex = resolve; }));
    await render();
    expect(classic().disabled).toBe(true);
    act(() => classic().click());
    expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
    await act(async () => { resolveIndex(index); await new Promise(resolve => setTimeout(resolve, 0)); });
    await vi.waitFor(() => expect(classic().disabled).toBe(false));
    await act(async () => { classic().click(); });
    expect(mocks.detail).toHaveBeenCalledTimes(1); expect(mocks.toast).not.toHaveBeenCalled();
    expect(container.querySelectorAll('button.h-14')).toHaveLength(4);
  });
  it('offers a retry after an initial failure instead of starting with an empty pool', async () => {
    mocks.index.mockRejectedValueOnce(new Error('503')).mockResolvedValue(index);
    await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(container.querySelector('[role="alert"]')).not.toBeNull(); expect(classic().disabled).toBe(true);
    const retry = [...container.querySelectorAll('button')].find(button => button.textContent === 'common.retry')!;
    await act(async () => { retry.click(); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(classic().disabled).toBe(false); expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('keeps cached data usable when a background refresh fails', async () => {
    client.setQueryData(pokemonKeys.allSearchIndex(), index);
    mocks.index.mockRejectedValue(new Error('503'));
    await render();
    await act(async () => { await client.invalidateQueries({ queryKey: pokemonKeys.allSearchIndex() }); });
    expect(classic().disabled).toBe(false); expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
