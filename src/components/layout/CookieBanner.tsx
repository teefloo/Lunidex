'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

import i18n, { useTranslation } from '@/lib/i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';

const STORAGE_KEY = 'primedex-cookie-consent';

type Consent = 'accepted' | 'rejected' | 'custom';

function readStoredConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'accepted' || value === 'rejected' || value === 'custom') {
      return value;
    }
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.)
  }
  return null;
}

function writeStoredConsent(consent: Consent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // ignore — see above
  }
}

const subscribe = () => () => {};

function getSnapshot(): boolean {
  return readStoredConsent() === null;
}

function getServerSnapshot(): boolean {
  return false;
}

function getCurrentLanguage(): SupportedLanguage {
  const candidate = (i18n.language ?? 'en').split('-')[0];
  return isSupportedLanguage(candidate) ? candidate : 'en';
}

export default function CookieBanner() {
  const { t } = useTranslation();
  const [language] = useState<SupportedLanguage>(getCurrentLanguage);
  const [postActionVisible, setPostActionVisible] = useState(false);
  const initialVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = initialVisible && !postActionVisible;

  const handleAccept = () => {
    writeStoredConsent('accepted');
    setPostActionVisible(true);
  };

  const handleReject = () => {
    writeStoredConsent('rejected');
    setPostActionVisible(true);
  };

  if (!visible) {
    return null;
  }

  const cookiesHref = `/${language}/cookies`;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('legal.banner.title')}
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-6 sm:bottom-6"
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-foreground/15 bg-background/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              {t('legal.banner.title')}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t('legal.banner.description')}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground/80 sm:text-xs">
              {t('legal.banner.disclaimer')}{' '}
              <Link
                href={cookiesHref}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t('legal.banner.policy_link')}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground sm:text-sm"
          >
            {t('legal.banner.reject')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 sm:text-sm"
          >
            {t('legal.banner.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
