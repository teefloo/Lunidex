const resetCredentialQueryParams = ['token', 'token_hash', 'code'] as const;
const resetCredentialFragmentParams = ['access_token', 'refresh_token', 'token_hash', 'code'] as const;
const authErrorParams = ['error', 'error_code', 'error_description'] as const;

export interface ResetLinkCapture {
  token: string | null;
  sanitizedLocation: string | null;
}

function hasAnyParam(params: URLSearchParams, names: readonly string[]): boolean {
  return names.some((name) => params.has(name));
}

function deleteParams(params: URLSearchParams, names: readonly string[]): void {
  names.forEach((name) => params.delete(name));
}

export function captureResetLink(url: URL): ResetLinkCapture {
  const queryParams = url.searchParams;
  const fragmentParams = new URLSearchParams(url.hash.slice(1));
  const hasCallbackError = queryParams.get('auth') === 'callback_error'
    || fragmentParams.get('auth') === 'callback_error'
    || hasAnyParam(queryParams, authErrorParams)
    || hasAnyParam(fragmentParams, authErrorParams);

  const tokenHash = queryParams.get('token_hash');
  const code = queryParams.get('code');
  const legacyToken = queryParams.get('token');
  const hasRecoverySession = queryParams.get('mode') === 'recovery'
    || Boolean(fragmentParams.get('access_token'));
  const token = hasCallbackError ? null
    : tokenHash ? `hash:${tokenHash}`
      : code ? `code:${code}`
        : legacyToken ?? (hasRecoverySession ? 'session' : null);

  const hasCredentialInUrl = hasAnyParam(queryParams, resetCredentialQueryParams)
    || hasAnyParam(fragmentParams, resetCredentialFragmentParams);
  if (!hasCallbackError && !hasCredentialInUrl) {
    return { token, sanitizedLocation: null };
  }

  const sanitizedUrl = new URL(url.href);
  deleteParams(sanitizedUrl.searchParams, resetCredentialQueryParams);
  deleteParams(sanitizedUrl.searchParams, authErrorParams);
  deleteParams(sanitizedUrl.searchParams, resetCredentialFragmentParams);
  deleteParams(sanitizedUrl.searchParams, ['access_token', 'refresh_token']);
  if (sanitizedUrl.searchParams.get('auth') === 'callback_error') {
    sanitizedUrl.searchParams.delete('auth');
  }

  const sanitizedFragment = new URLSearchParams(sanitizedUrl.hash.slice(1));
  deleteParams(sanitizedFragment, resetCredentialFragmentParams);
  deleteParams(sanitizedFragment, authErrorParams);
  if (sanitizedFragment.get('auth') === 'callback_error') sanitizedFragment.delete('auth');
  sanitizedUrl.hash = hasCallbackError || sanitizedFragment.size === 0
    ? ''
    : `#${sanitizedFragment.toString()}`;
  if (hasCallbackError) sanitizedUrl.searchParams.delete('mode');

  return {
    token,
    sanitizedLocation: `${sanitizedUrl.pathname}${sanitizedUrl.search}${sanitizedUrl.hash}`,
  };
}

export function isExpiredResetLinkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const code = 'code' in error && typeof error.code === 'string'
    ? error.code.toLowerCase()
    : '';
  if (code === 'otp_expired') return true;

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';
  return /(?:token|otp|link).{0,60}(?:expired|invalid)|(?:expired|invalid).{0,60}(?:token|otp|link)/.test(message);
}
