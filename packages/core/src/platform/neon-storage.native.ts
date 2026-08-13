import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthStorage } from './neon-storage';

const memoryFallback = new Map<string, string>();

async function secureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const authStorage: AuthStorage = {
  async getItem(key) {
    if (!(await secureStoreAvailable())) return memoryFallback.get(key) ?? null;

    try {
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue !== null) return secureValue;

      // Migrate one legacy value once SecureStore is available, then remove
      // the plaintext AsyncStorage copy. If migration fails, do not fall back
      // to persistent plaintext storage.
      const legacyValue = await AsyncStorage.getItem(key);
      if (legacyValue === null) return null;
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
      return legacyValue;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  async setItem(key, value) {
    if (!(await secureStoreAvailable())) {
      memoryFallback.set(key, value);
      await AsyncStorage.removeItem(key).catch(() => undefined);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
      memoryFallback.delete(key);
    } catch {
      // A process-memory fallback preserves the current session without
      // reintroducing an unencrypted persistent copy.
      memoryFallback.set(key, value);
    }
  },
  async removeItem(key) {
    memoryFallback.delete(key);
    await AsyncStorage.removeItem(key).catch(() => undefined);
    if (await secureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    }
  },
};
