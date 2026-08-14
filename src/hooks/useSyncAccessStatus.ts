'use client';

import { useSyncExternalStore } from 'react';
import {
  getSyncAccessStatus,
  onSyncAccessStatusChange,
  type SyncAccessStatus,
} from '@/store/sync-access';

const subscribe = (listener: () => void): (() => void) => (
  onSyncAccessStatusChange(() => listener())
);

export function useSyncAccessStatus(): SyncAccessStatus {
  return useSyncExternalStore(subscribe, getSyncAccessStatus, () => 'checking');
}
