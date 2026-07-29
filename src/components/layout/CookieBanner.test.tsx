import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CookieBanner from './CookieBanner';
import { ConsentPreferencesButton } from './ConsentPreferencesButton';
import { getProductConsent } from '@/lib/product-measurement';

vi.mock('@/lib/i18n', () => ({
  default: { language: 'en' },
  useTranslation: () => ({ t: (key: string, values?: { defaultValue?: string }) => values?.defaultValue ?? ({
    'legal.banner.title': 'Your privacy choices', 'legal.banner.description': 'Choose optional measurement.',
    'legal.banner.disclaimer': 'You can change your choice.', 'legal.banner.policy_link': 'Cookie policy',
    'legal.banner.reject': 'Reject all', 'legal.banner.accept': 'Accept all', 'legal.banner.manage': 'Customize',
  }[key] ?? key) }),
}));

function activate(button: HTMLElement) {
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.click(button);
}

describe('CookieBanner', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('opens granular preferences from the footer and focuses the first preference', async () => {
    render(<><ConsentPreferencesButton label="Manage preferences" /><CookieBanner /></>);
    const opener = screen.getByRole('button', { name: 'Manage preferences' });
    activate(opener);
    const audience = await screen.findByRole('checkbox', { name: 'Vercel Web Analytics and Speed Insights' });
    expect(audience).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: 'Supabase product measurement' })).not.toBeChecked();
  });

  it('supports separate choices, keyboard activation, saving and focus restoration', async () => {
    render(<><ConsentPreferencesButton label="Manage preferences" /><CookieBanner /></>);
    const opener = screen.getByRole('button', { name: 'Manage preferences' });
    activate(opener);
    const audience = await screen.findByRole('checkbox', { name: 'Vercel Web Analytics and Speed Insights' });
    const product = screen.getByRole('checkbox', { name: 'Supabase product measurement' });
    fireEvent.click(audience);
    expect(audience).toBeChecked();
    expect(product).not.toBeChecked();
    activate(screen.getByRole('button', { name: 'Save my choices' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(getProductConsent()).toMatchObject({ audiencePerformance: 'granted', productMeasurement: 'denied' });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('accepts and refuses all, then permits later withdrawal from the footer', async () => {
    const { rerender } = render(<CookieBanner />);
    activate(screen.getByRole('button', { name: 'Accept all' }));
    await waitFor(() => expect(getProductConsent()).toMatchObject({ audiencePerformance: 'granted', productMeasurement: 'granted' }));
    rerender(<><ConsentPreferencesButton label="Manage preferences" /><CookieBanner /></>);
    activate(screen.getByRole('button', { name: 'Manage preferences' }));
    activate(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => expect(getProductConsent()).toMatchObject({ audiencePerformance: 'denied', productMeasurement: 'denied' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens customization from the banner without preselecting either purpose', async () => {
    render(<CookieBanner />);
    activate(screen.getByRole('button', { name: 'Customize' }));
    const audience = await screen.findByRole('checkbox', { name: 'Vercel Web Analytics and Speed Insights' });
    expect(audience).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Supabase product measurement' })).not.toBeChecked();
  });
});
