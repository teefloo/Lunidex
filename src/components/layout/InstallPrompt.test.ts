import { describe, expect, it } from 'vitest';
import { detectInstallPromptMode } from './InstallPrompt';

const iphoneSafari = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
  platform: 'iPhone',
  maxTouchPoints: 5,
};

describe('install prompt detection', () => {
  it('shows the Safari installation instructions on iOS Safari', () => {
    expect(detectInstallPromptMode(iphoneSafari, false)).toBe('ios-safari');
  });

  it('asks iOS browsers to continue in Safari', () => {
    expect(detectInstallPromptMode({
      ...iphoneSafari,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
    }, false)).toBe('ios-browser');
  });

  it('detects iPadOS desktop-mode Safari', () => {
    expect(detectInstallPromptMode({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }, false)).toBe('ios-safari');
  });

  it('does not show a prompt when already running as an installed app', () => {
    expect(detectInstallPromptMode(iphoneSafari, true)).toBeNull();
  });

  it('does not classify desktop browsers as iOS', () => {
    expect(detectInstallPromptMode({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    }, false)).toBeNull();
  });
});
