export const LUNIDEX_PROJECT_REF = 'vrovnfsdjfwuuomwsuvj';
export const SYNTHETIC_SMOKE_TAG = 'lunidex-hosted-migration-smoke-v1';
export const SYNTHETIC_SMOKE_METADATA_KEY = 'lunidex_synthetic_smoke';
export const SYNTHETIC_SMOKE_EMAIL_PREFIX = 'lunidex-migration-smoke+';
export const SYNTHETIC_SMOKE_EMAIL_PATTERN = /^lunidex-migration-smoke\+[0-9a-f-]{36}@lunidex\.app$/i;

export function isSyntheticSmokeUser(user) {
  return typeof user?.email === 'string'
    && SYNTHETIC_SMOKE_EMAIL_PATTERN.test(user.email)
    && user.app_metadata?.[SYNTHETIC_SMOKE_METADATA_KEY] === SYNTHETIC_SMOKE_TAG;
}
