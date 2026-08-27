'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { SupportedLanguage } from '@/lib/languages';

const ClientLanguageContext = createContext<SupportedLanguage>('en');

interface ClientLanguageProviderProps {
  children: ReactNode;
  initialLanguage: SupportedLanguage;
}

export function ClientLanguageProvider({
  children,
  initialLanguage,
}: ClientLanguageProviderProps) {
  return (
    <ClientLanguageContext.Provider value={initialLanguage}>
      {children}
    </ClientLanguageContext.Provider>
  );
}

export function useInitialClientLanguage(): SupportedLanguage {
  return useContext(ClientLanguageContext);
}
