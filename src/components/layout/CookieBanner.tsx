'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { Button } from '@/components/ui/button';
import { getProductConsent, setProductConsent, type ProductConsent } from '@/lib/product-measurement';

const STORAGE_KEY = 'primedex-cookie-consent';

const preferenceLabels: Record<SupportedLanguage, { audience: string; product: string; save: string; customize: string }> = {
  en: { audience: 'Vercel Web Analytics and Speed Insights', product: 'Neon product measurement', save: 'Save my choices', customize: 'Customize' },
  fr: { audience: 'Vercel Web Analytics et Speed Insights', product: 'Mesure produit Neon', save: 'Enregistrer mes choix', customize: 'Personnaliser' },
  es: { audience: 'Vercel Web Analytics y Speed Insights', product: 'Medición de producto de Neon', save: 'Guardar mis elecciones', customize: 'Personalizar' },
  de: { audience: 'Vercel Web Analytics und Speed Insights', product: 'Neon-Produktmessung', save: 'Meine Auswahl speichern', customize: 'Anpassen' },
  it: { audience: 'Vercel Web Analytics e Speed Insights', product: 'Misurazione del prodotto Neon', save: 'Salva le mie scelte', customize: 'Personalizza' },
  ja: { audience: 'Vercel Web Analytics と Speed Insights', product: 'Neon プロダクト測定', save: '選択を保存', customize: 'カスタマイズ' },
  ko: { audience: 'Vercel Web Analytics 및 Speed Insights', product: 'Neon 제품 측정', save: '선택 저장', customize: '맞춤 설정' },
  zh: { audience: 'Vercel Web Analytics 和 Speed Insights', product: 'Neon 产品衡量', save: '保存我的选择', customize: '自定义' },
};

function readStoredConsent(): ProductConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const legacy = window.localStorage.getItem(STORAGE_KEY);
    if (legacy === 'accepted' || legacy === 'rejected' || legacy === 'custom') return null;
    const value = getProductConsent();
    if (value.productMeasurement !== 'unset' || value.audiencePerformance !== 'unset') return value;
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.)
  }
  return null;
}

function writeStoredConsent(consent: ProductConsent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    setProductConsent(consent);
  } catch {
    // ignore — see above
  }
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('primedex-consent-changed', listener);
  return () => window.removeEventListener('primedex-consent-changed', listener);
}

function getSnapshot(): boolean {
  return readStoredConsent() === null;
}

function getServerSnapshot(): boolean {
  return false;
}

function getCurrentLanguage(language: string): SupportedLanguage {
  const candidate = language.split('-')[0];
  return isSupportedLanguage(candidate) ? candidate : 'en';
}

export default function CookieBanner() {
  const { t, i18n } = useTranslation();
  const language = getCurrentLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
  const [customizing, setCustomizing] = useState(false);
  const [audiencePerformance, setAudiencePerformance] = useState(false);
  const [productMeasurement, setProductMeasurement] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const firstPreferenceRef = useRef<HTMLInputElement | null>(null);
  const initialVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const visible = initialVisible;

  useEffect(() => {
    const openPreferences = (event: Event) => {
      openerRef.current = (event as CustomEvent<{ opener?: HTMLElement }>).detail?.opener ?? null;
      setCustomizing(true);
    };
    window.addEventListener('primedex-open-consent-preferences', openPreferences);
    return () => window.removeEventListener('primedex-open-consent-preferences', openPreferences);
  }, []);

  useEffect(() => {
    if (visible && customizing) firstPreferenceRef.current?.focus();
  }, [customizing, visible]);

  const restoreFocus = () => window.setTimeout(() => openerRef.current?.focus(), 0);

  const save = (audience: boolean, product: boolean) => {
    writeStoredConsent({ version: 2, policyVersion: '2026-07-29', chosenAt: new Date().toISOString(), audiencePerformance: audience ? 'granted' : 'denied', productMeasurement: product ? 'granted' : 'denied' });
    restoreFocus();
  };
  const handleAccept = () => save(true, true);

  const handleReject = () => {
    save(false, false);
  };

  if (!visible) {
    return null;
  }

  const cookiesHref = `/${language}/cookies`;
  const labels = preferenceLabels[language];

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description cookie-consent-disclaimer"
      className="fixed inset-x-2 bottom-2 z-50 sm:inset-x-6 sm:bottom-6"
    >
      <div className="glass-panel mx-auto w-full max-w-xl p-3 sm:p-5">
        <div className="flex items-start gap-2 sm:gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-accent sm:h-9 sm:w-9"
            aria-hidden="true"
          >
            <Cookie className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="font-display text-[0.8125rem] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
              {t('legal.banner.title')}
            </h2>
            <p id="cookie-consent-description" className="mt-1 max-h-[2.3rem] overflow-hidden text-[0.6875rem] leading-snug text-muted-foreground sm:mt-1.5 sm:max-h-none sm:overflow-visible sm:text-[0.8125rem] sm:leading-relaxed">
              {t('legal.banner.description')}
            </p>
            <p id="cookie-consent-disclaimer" className="sr-only sm:not-sr-only sm:mt-2 sm:text-xs sm:leading-relaxed">
              {t('legal.banner.disclaimer')}{' '}
              <Link
                href={cookiesHref}
                className="touch-target inline-flex items-center rounded-sm text-foreground/90 underline underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {t('legal.banner.policy_link')}
              </Link>
            </p>
          </div>
        </div>

        {customizing && (
          <fieldset className="mt-3 space-y-3 rounded-sm border border-border/40 p-2.5 sm:mt-4 sm:p-3">
            <legend className="px-1 text-xs font-semibold sm:text-sm">{t('legal.banner.manage', { defaultValue: 'Manage preferences' })}</legend>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input ref={firstPreferenceRef} type="checkbox" checked={audiencePerformance} onChange={(event) => setAudiencePerformance(event.target.checked)} />
              <span>{labels.audience}</span>
            </label>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" checked={productMeasurement} onChange={(event) => setProductMeasurement(event.target.checked)} />
              <span>{labels.product}</span>
            </label>
            <Button type="button" size="touch" onClick={() => save(audiencePerformance, productMeasurement)}>{labels.save}</Button>
          </fieldset>
        )}
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:flex sm:items-center sm:justify-end sm:gap-2.5">
          <Button type="button" variant="default" size="touch" className="w-full min-w-0 px-1.5 text-[0.6875rem] leading-tight whitespace-normal sm:w-auto sm:px-4 sm:text-sm sm:whitespace-nowrap" onClick={handleReject}>
            {t('legal.banner.reject', { defaultValue: 'Reject all' })}
          </Button>
          <Button type="button" variant="ghost" size="touch" className="w-full min-w-0 px-1.5 text-[0.6875rem] leading-tight whitespace-normal sm:w-auto sm:px-4 sm:text-sm sm:whitespace-nowrap" onClick={() => setCustomizing(true)}>{labels.customize}</Button>
          <Button type="button" variant="default" size="touch" className="w-full min-w-0 px-1.5 text-[0.6875rem] leading-tight whitespace-normal sm:w-auto sm:px-4 sm:text-sm sm:whitespace-nowrap" onClick={handleAccept}>
            {t('legal.banner.accept', { defaultValue: 'Accept all' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
