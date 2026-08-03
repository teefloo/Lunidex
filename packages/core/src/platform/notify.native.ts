import { Alert } from 'react-native';

/**
 * React Native user-facing notifications. A lightweight Alert is enough for the
 * rare sync-failure path; richer in-app toasts can replace this later.
 */
export const notify = {
  error: (message: string) => Alert.alert('Lunidex', message),
  success: () => {},
};
