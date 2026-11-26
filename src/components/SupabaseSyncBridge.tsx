'use client';

import { useSupabaseSync } from '@/lib/supabase/useSupabaseSync';

export function SupabaseSyncBridge() {
  useSupabaseSync();
  return null;
}
