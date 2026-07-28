import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderActions } from './HeaderActions';

const mockStore = vi.hoisted(() => ({
  theme: 'light' as const,
  setTheme: vi.fn(),
  toggleSettings: vi.fn(),
  language: 'en',
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => true,
}));

vi.mock('@/hooks/useChangeLanguage', () => ({
  useChangeLanguage: () => vi.fn(),
}));

vi.mock('@/hooks/useLocaleHref', () => ({
  useClientLanguage: () => 'en',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { defaultValue?: string }) => values?.defaultValue ?? ({
      'header.open_settings': 'Open Settings',
      'nav.favorites': 'Favorites',
      'settings.light': 'Light',
      'settings.dark': 'Dark',
      'settings.system': 'System',
      'settings.auto': 'Auto',
      'languages.auto': 'Auto',
      'languages.en': 'English',
      'languages.fr': 'Français',
      'languages.de': 'Deutsch',
      'languages.es': 'Español',
      'languages.it': 'Italiano',
      'languages.ja': '日本語',
      'languages.ko': '한국어',
      'languages.zh': '中文',
    }[key] ?? key),
  }),
}));

vi.mock('@/components/auth/AccountMenu', () => ({
  default: () => <div data-testid="account-menu" />,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => <button type="button" {...props}>{children}</button>,
  SelectValue: () => null,
}));

describe('HeaderActions', () => {
  it('provides a touch-sized labelled control that opens global settings', () => {
    render(<HeaderActions />);

    const settings = screen.getByRole('button', { name: 'Open Settings' });
    expect(settings).toHaveClass('h-11', 'w-11');

    fireEvent.click(settings);
    expect(mockStore.toggleSettings).toHaveBeenCalledOnce();
  });
});
