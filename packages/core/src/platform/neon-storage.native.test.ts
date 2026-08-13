import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  isAvailableAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
const asyncStorage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);
vi.mock('@react-native-async-storage/async-storage', () => ({ default: asyncStorage }));

import { authStorage } from './neon-storage.native';

describe('native Neon auth storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureStore.isAvailableAsync.mockResolvedValue(true);
    secureStore.getItemAsync.mockResolvedValue(null);
    secureStore.setItemAsync.mockResolvedValue(undefined);
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    asyncStorage.getItem.mockResolvedValue(null);
    asyncStorage.setItem.mockResolvedValue(undefined);
    asyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it('reads from SecureStore and never touches AsyncStorage when a secure value exists', async () => {
    secureStore.getItemAsync.mockResolvedValue('secure-session');

    await expect(authStorage.getItem('session')).resolves.toBe('secure-session');
    expect(asyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('migrates the legacy AsyncStorage value into SecureStore once', async () => {
    asyncStorage.getItem.mockResolvedValue('legacy-session');

    await expect(authStorage.getItem('session')).resolves.toBe('legacy-session');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('session', 'legacy-session');
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('session');
  });

  it('keeps a process-memory value instead of persisting plaintext when SecureStore is unavailable', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(false);

    await authStorage.setItem('session', 'memory-session');

    await expect(authStorage.getItem('session')).resolves.toBe('memory-session');
    expect(asyncStorage.setItem).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('session');
  });
});
