export function requireSupabaseAdminKey(env = process.env) {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (secretKey) return secretKey;

  const legacyServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  throw new Error('Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy fallback) in the protected environment.');
}
