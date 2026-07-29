import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const isProductMetricsConfigured = Boolean(url && secret);

export function getProductMetricsClient(): SupabaseClient | null {
  if (!isProductMetricsConfigured) return null;
  return createClient(url as string, secret as string, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
