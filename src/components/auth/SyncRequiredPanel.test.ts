// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/lib/i18n/en';
import fr from '@/lib/i18n/fr';
import es from '@/lib/i18n/es';
import de from '@/lib/i18n/de';
import italian from '@/lib/i18n/it';
import ja from '@/lib/i18n/ja';
import ko from '@/lib/i18n/ko';
import zh from '@/lib/i18n/zh';

const mocks = vi.hoisted(() => ({
  auth: {
    enabled: true,
    sessionStatus: 'unavailable' as 'checking' | 'resolved' | 'unavailable',
    retrySession: vi.fn(),
  },
}));

vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./AuthModalBoundary', () => ({ AuthModalBoundary: () => null }));

import { SyncRequiredPanel } from './SyncRequiredPanel';

describe('SyncRequiredPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.auth.sessionStatus = 'unavailable';
    mocks.auth.retrySession.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('has a translated recovery title in every supported interface locale', () => {
    const titles = [en, fr, es, de, italian, ja, ko, zh].map((locale) => locale.translation.auth.session_unavailable_title);
    expect(titles).toHaveLength(8);
    expect(new Set(titles).size).toBe(8);
    expect(titles).not.toContain('auth.session_unavailable_title');
  });

  it('shows a session recovery action instead of a sign-in prompt when verification failed', async () => {
    await act(async () => root.render(createElement(SyncRequiredPanel)));

    expect(container.textContent).toContain('auth.session_unavailable_title');
    expect(container.textContent).toContain('auth.session_unavailable');
    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'common.retry');
    expect(button).toBeInstanceOf(HTMLButtonElement);

    await act(async () => (button as HTMLButtonElement).click());
    expect(mocks.auth.retrySession).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('auth.signin_title');
  });
});
