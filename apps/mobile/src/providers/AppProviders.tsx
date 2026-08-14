import 'react-native-url-polyfill/auto';
import { Alert } from 'react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { usePrimeDexStore } from '@primedex/core';
import { onSyncAccessRequired } from '@primedex/core';
import { AuthProvider, useAuth } from '@primedex/core/neon/AuthProvider';
import { useNeonSync } from '@primedex/core/neon/useNeonSync';
import { resolveLanguage } from '@primedex/core/lib/languages';
import i18n, { loadLanguage } from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';

/** Mirrors the authenticated session to the user's Neon row (no-op offline). */
function NeonSyncBridge() {
  useNeonSync();
  return null;
}

function SyncAuthNotice() {
  const { t } = useTranslation();
  const { enabled } = useAuth();

  useEffect(() => onSyncAccessRequired(() => {
    Alert.alert(
      t('auth.signin_title', { defaultValue: 'Account required' }),
      enabled
        ? t('auth.signin_subtitle', { defaultValue: 'Sign in from the Account tab to save and sync your data.' })
        : t('auth.session_unavailable', { defaultValue: 'Accounts are not configured on this build.' }),
    );
  }), [enabled, t]);

  return null;
}

/**
 * Keeps i18n in sync with the store, and seeds the OS language once after the
 * persisted state hydrates — the native counterpart of the web ThemeProvider.
 */
function LocaleBridge({ children }: { children: ReactNode }) {
  const language = usePrimeDexStore((s) => s.language);
  const systemLanguage = usePrimeDexStore((s) => s.systemLanguage);
  const setSystemLanguage = usePrimeDexStore((s) => s.setSystemLanguage);
  const hasHydrated = usePrimeDexStore((s) => s._hasHydrated);
  const detectedRef = useRef(false);

  const resolved = resolveLanguage(language, systemLanguage);

  useEffect(() => {
    if (!hasHydrated || detectedRef.current) return;
    detectedRef.current = true;
    const deviceLang = getLocales()?.[0]?.languageCode;
    if (deviceLang && deviceLang !== systemLanguage) {
      setSystemLanguage(deviceLang);
    }
  }, [hasHydrated, systemLanguage, setSystemLanguage]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadLanguage(resolved).then(() => i18n.changeLanguage(resolved));
  }, [resolved, hasHydrated]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000,
            gcTime: 60 * 60 * 1000,
            retry: 1,
            refetchOnReconnect: 'always',
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LocaleBridge>
            <SyncAuthNotice />
            <NeonSyncBridge />
            {children}
          </LocaleBridge>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
