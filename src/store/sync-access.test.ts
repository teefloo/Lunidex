import { describe, expect, it } from 'vitest';
import { onSyncAccessRequired, requestSyncAccess, type SyncAccessRequest } from './sync-access';

describe('sync access requests', () => {
  it('distinguishes explicit prompts from quiet background requests', () => {
    const requests: SyncAccessRequest[] = [];
    const unsubscribe = onSyncAccessRequired((request) => requests.push(request));

    requestSyncAccess();
    requestSyncAccess({ prompt: false });

    unsubscribe();

    expect(requests).toEqual([{}, { prompt: false }]);
  });
});
