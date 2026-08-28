import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CacheStorage } from './cache-storage';

/**
 * React Native cache adapter backed by AsyncStorage. AsyncStorage stores
 * strings, so cache entries use JSON at this platform boundary.
 */
export const cacheStorage: CacheStorage = {
  async getItem(key) {
    const serialized = await AsyncStorage.getItem(key);
    if (serialized === null) return null;

    try {
      return JSON.parse(serialized) as unknown;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return;
    await AsyncStorage.setItem(key, serialized);
  },
  removeItem: (key) => AsyncStorage.removeItem(key),
  async keys() {
    return [...(await AsyncStorage.getAllKeys())];
  },
};
