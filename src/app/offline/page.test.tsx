import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server-i18n', () => ({
  getServerLanguage: vi.fn(async () => 'fr'),
  getServerT: vi.fn(async () => (key: string) => {
    const values: Record<string, string> = {
      'offline.eyebrow': 'Signal perdu',
      'offline.title': 'Lunidex est momentanément hors ligne',
      'offline.description': 'Une connexion est nécessaire pour charger cette page.',
      'offline.retry': 'Réessayer',
      'offline.home': 'Retour à l’accueil',
      'offline.local_note': 'Les pages déjà consultées peuvent rester accessibles hors connexion.',
    };

    return values[key] ?? key;
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { ...props, href }, children),
}));

vi.mock('@/components/ui/LunidexLogo', () => ({
  default: ({ alt, className }: { alt?: string; className?: string }) =>
    React.createElement('img', {
      src: '/brand/lunidex-mark-square.png',
      alt,
      className,
    }),
}));

import OfflinePage from './page';

describe('OfflinePage', () => {
  it('renders a localized recovery state with a native retry action', async () => {
    const markup = renderToStaticMarkup(await OfflinePage());

    expect(markup).toContain('Signal perdu');
    expect(markup).toContain('Lunidex est momentanément hors ligne');
    expect(markup).toContain('method="get"');
    expect(markup).toContain('action=""');
    expect(markup).toContain('Réessayer');
    expect(markup).toContain('href="/fr"');
    expect(markup).toContain('prefers-reduced-motion');
  });
});
