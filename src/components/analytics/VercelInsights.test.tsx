import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setProductConsent } from '@/lib/product-measurement';
import { VercelInsights } from './VercelInsights';

vi.mock('@vercel/analytics/react', () => ({ Analytics: () => <div data-testid="vercel-analytics" /> }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => <div data-testid="vercel-speed-insights" /> }));

const consent = (audiencePerformance: 'granted' | 'denied' | 'unset', productMeasurement: 'granted' | 'denied' | 'unset') => ({
  version: 2 as const,
  policyVersion: '2026-07-29' as const,
  chosenAt: audiencePerformance === 'unset' && productMeasurement === 'unset' ? '' : '2026-07-30T00:00:00.000Z',
  audiencePerformance,
  productMeasurement,
});

describe('VercelInsights', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('keeps both trackers absent when consent is unset or refused', () => {
    setProductConsent(consent('unset', 'unset'));
    const { rerender } = render(<VercelInsights />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument();
    act(() => setProductConsent(consent('denied', 'granted')));
    rerender(<VercelInsights />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument();
  });

  it('mounts immediately after audience consent and unmounts immediately after withdrawal', () => {
    setProductConsent(consent('unset', 'unset'));
    render(<VercelInsights />);
    act(() => setProductConsent(consent('granted', 'denied')));
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument();
    act(() => setProductConsent(consent('denied', 'denied')));
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument();
  });

  it('does not depend on product-measurement consent', () => {
    setProductConsent(consent('granted', 'denied'));
    const { rerender } = render(<VercelInsights />);
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    act(() => setProductConsent(consent('granted', 'granted')));
    rerender(<VercelInsights />);
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    act(() => setProductConsent(consent('granted', 'denied')));
    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument();
  });
});
