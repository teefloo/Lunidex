'use client';

import { useNeonSync } from '@/lib/neon/useNeonSync';

export function NeonSyncBridge() {
  useNeonSync();
  return null;
}
