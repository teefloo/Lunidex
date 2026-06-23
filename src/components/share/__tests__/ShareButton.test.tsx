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
  url: 'https://primedex.vercel.app/pokemon/pikachu?utm_source=share&utm_medium=social',
  title: 'Pikachu | PrimeDex',
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

  // ─── Test 2: Fallback dropdown shown when navigator.share is undefined ──
  it('opens fallback dropdown when navigator.share is not available', async () => {
    render(<ShareButton {...defaultProps} label="Share" />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Copy link')).toBeInTheDocument();
      expect(screen.getByText('Share on X / Twitter')).toBeInTheDocument();
      expect(screen.getByText('Copy for Discord')).toBeInTheDocument();
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

  // ─── Test 4: Twitter URL built correctly ─────────────────────────────────
  it('opens a Twitter intent URL with the correct text and url params', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ShareButton {...defaultProps} label="Share" />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByText('Share on X / Twitter'));

    fireEvent.click(screen.getByText('Share on X / Twitter'));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledOnce();
      const [calledUrl] = openSpy.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toContain('https://twitter.com/intent/tweet');
      expect(calledUrl).toContain(encodeURIComponent(defaultProps.url));
      expect(calledUrl).toContain(encodeURIComponent(defaultProps.title));
    });

    openSpy.mockRestore();
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
