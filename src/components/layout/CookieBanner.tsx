'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

import i18n, { useTranslation } from '@/lib/i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { Button } from '@/components/ui/button';

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

  // No dynamic padding manipulation — the fixed-position banner
  // floats above content, so no CLS reservation is needed.

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
      <div className="glass-panel mx-auto w-full max-w-xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-accent"
            aria-hidden="true"
          >
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {t('legal.banner.title')}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-[0.8125rem]">
              {t('legal.banner.description')}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80 sm:text-xs">
              {t('legal.banner.disclaimer')}{' '}
              <Link
                href={cookiesHref}
                className="rounded-sm text-foreground/90 underline underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {t('legal.banner.policy_link')}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={handleReject}>
            {t('legal.banner.reject')}
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleAccept}>
            {t('legal.banner.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
