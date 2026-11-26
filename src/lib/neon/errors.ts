/** Identifies the database guard raised when an account is being deleted. */
export function isInactiveAccountError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'P0001' || candidate.message === 'Account is not active';
}
