import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * React Native persistence adapter backed by AsyncStorage.
 *
 * Metro automatically resolves this `.native.ts` file over `storage.ts` for the
 * mobile build, so the shared store gets device-persistent state without the
 * web build ever importing AsyncStorage.
 */
export const storage: StateStorage = {
  getItem: (name: string): Promise<string | null> => AsyncStorage.getItem(name),
  setItem: (name: string, value: string): Promise<void> =>
    AsyncStorage.setItem(name, value),
  removeItem: (name: string): Promise<void> => AsyncStorage.removeItem(name),
};
