export type RecoverableErrorCategory =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'session'
  | 'forbidden'
  | 'missing'
  | 'conflict'
  | 'limit'
  | 'server';

function readErrorField(error: unknown, key: string): unknown {
  return typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

export function classifyRecoverableError(error: unknown): RecoverableErrorCategory | null {
  const statusValue = readErrorField(error, 'status') ?? readErrorField(error, 'statusCode');
  const status = typeof statusValue === 'number' ? statusValue : null;
  if (status === 401) return 'session';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'missing';
  if (status === 408) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 413 || status === 429) return 'limit';
  if (status !== null && status >= 500) return 'server';
  if (status === 400 || status === 422) return 'validation';

  const name = readErrorField(error, 'name');
  const code = readErrorField(error, 'code');
  const message = readErrorField(error, 'message');
  const normalizedName = typeof name === 'string' ? name.toLowerCase() : '';
  const normalizedCode = typeof code === 'string' ? code.toLowerCase() : '';
  const normalizedMessage = typeof message === 'string' ? message.toLowerCase() : '';

  if (normalizedName.includes('timeout') || normalizedCode === 'etimedout' || normalizedCode === 'econnaborted' || normalizedMessage.includes('timed out')) return 'timeout';
  if (normalizedName === 'zoderror' || normalizedName === 'validationerror') return 'validation';
  if (normalizedCode === 'err_network' || normalizedCode === 'enetwork' || normalizedMessage === 'failed to fetch' || normalizedMessage.includes('network request failed')) return 'network';
  return null;
}
