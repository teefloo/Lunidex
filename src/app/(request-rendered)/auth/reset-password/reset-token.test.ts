import { describe, expect, it } from 'vitest';
import { captureResetLink, isExpiredResetLinkError } from './reset-token';

describe('reset link capture', () => {
  it('treats callback errors as expired reset links and scrubs their URL data', () => {
    const capture = captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&auth=callback_error#access_token=access-secret&error_code=otp_expired',
    ));

    expect(capture.token).toBeNull();
    expect(capture.sanitizedLocation).toBe('/fr/auth/reset-password');
    expect(capture.sanitizedLocation).not.toContain('access-secret');
    expect(capture.sanitizedLocation).not.toContain('otp_expired');
  });

  it('treats a fragment error as invalid even when the URL requests recovery mode', () => {
    const capture = captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery#error_code=otp_expired&error_description=Expired',
    ));

    expect(capture.token).toBeNull();
    expect(capture.sanitizedLocation).toBe('/fr/auth/reset-password');
  });

  it('preserves a valid authorization-code recovery flow while removing the code from the address bar', () => {
    const capture = captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&code=one-time-code',
    ));

    expect(capture.token).toBe('code:one-time-code');
    expect(capture.sanitizedLocation).toBe('/fr/auth/reset-password?mode=recovery');
  });

  it('preserves token-hash recovery flow for explicit verification on submit', () => {
    const capture = captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery&token_hash=recovery-hash&type=recovery',
    ));

    expect(capture.token).toBe('hash:recovery-hash');
    expect(capture.sanitizedLocation).toBe('/fr/auth/reset-password?mode=recovery&type=recovery');
  });

  it('preserves a cookie-backed recovery session when no error is present', () => {
    expect(captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password?mode=recovery',
    ))).toEqual({ token: 'session', sanitizedLocation: null });
  });

  it('preserves a fragment-backed recovery session while scrubbing credentials', () => {
    const capture = captureResetLink(new URL(
      'https://lunidex.app/fr/auth/reset-password#access_token=access-secret&refresh_token=refresh-secret&type=recovery',
    ));

    expect(capture.token).toBe('session');
    expect(capture.sanitizedLocation).toBe('/fr/auth/reset-password#type=recovery');
    expect(capture.sanitizedLocation).not.toContain('secret');
  });
});

describe('expired reset error detection', () => {
  it('recognizes the Supabase otp_expired code without exposing the message', () => {
    expect(isExpiredResetLinkError({ code: 'otp_expired', message: 'opaque' })).toBe(true);
  });

  it('recognizes expired or invalid token messages', () => {
    expect(isExpiredResetLinkError(new Error('Token has expired or is invalid'))).toBe(true);
    expect(isExpiredResetLinkError(new Error('Network request failed'))).toBe(false);
  });
});
