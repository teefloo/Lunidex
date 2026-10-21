'use client';

import { useSyncExternalStore } from 'react';
import {
  getSyncWriteStatus,
  subscribeToSyncWriteStatus,
} from '@/store/sync-write-status';

const SERVER_IDLE_STATUS = { state: 'idle' } as const;

export function useSyncWriteStatus() {
  return useSyncExternalStore(
    subscribeToSyncWriteStatus,
    getSyncWriteStatus,
    () => SERVER_IDLE_STATUS,
  );
}
