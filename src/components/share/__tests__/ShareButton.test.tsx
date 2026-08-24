import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from '../ShareButton';

// ─── Sonner toast mock ─────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────
const defaultProps = {
  url: 'https://lunidex.app/pokemon/pikachu?utm_source=share&utm_medium=social',
  title: 'Pikachu | Lunidex',
  description: 'Electric-type Pokémon #025',
};

beforeEach(() => {
  // Ensure navigator.share is undefined by default (desktop fallback path)
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Test 1: Renders without error ────────────────────────────────────────
describe('ShareButton', () => {
  it('renders without throwing', () => {
    const { container } = render(<ShareButton {...defaultProps} label="Share" />);
    expect(container.querySelector('button')).toBeTruthy();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders an icon-only control when requested', () => {
    render(<ShareButton {...defaultProps} label="Share" iconOnly />);

    const button = screen.getByRole('button', { name: 'Share' });
    expect(button).toHaveAttribute('aria-label', 'Share');
    expect(button).toHaveAttribute('title', 'Share');
    expect(button).not.toHaveTextContent('Share');
    expect(button.querySelectorAll('svg')).toHaveLength(1);
  });

  // ─── Test 2: Fallback dropdown shown when navigator.share is undefined ──
  it('opens fallback dropdown when navigator.share is not available', async () => {
    render(<ShareButton {...defaultProps} label="Share" />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Copy link')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    });
  });

  // ─── Test 3: Clipboard called on "Copy link" ───────────────────────────
  it('calls navigator.clipboard.writeText with the URL on "Copy link"', async () => {
    render(<ShareButton {...defaultProps} label="Share" />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByText('Copy link'));

    // Click "Copy link"
    fireEvent.click(screen.getByText('Copy link'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
    });
  });

  // ─── Bonus: navigator.share called when available ────────────────────────
  it('calls navigator.share directly when the Web Share API is available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });

    render(<ShareButton {...defaultProps} label="Share" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({
        title: defaultProps.title,
        text: defaultProps.description,
        url: defaultProps.url,
      });
    });
  });
});
