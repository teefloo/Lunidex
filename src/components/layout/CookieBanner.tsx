'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

import i18n, { useTranslation } from '@/lib/i18n';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/languages';
import { Button } from '@/components/ui/button';
import { getProductConsent, setProductConsent, type ProductConsent } from '@/lib/product-measurement';

const STORAGE_KEY = 'primedex-cookie-consent';

const preferenceLabels: Record<SupportedLanguage, { audience: string; product: string; save: string; customize: string }> = {
  en: { audience: 'Vercel Web Analytics and Speed Insights', product: 'Supabase product measurement', save: 'Save my choices', customize: 'Customize' },
  fr: { audience: 'Vercel Web Analytics et Speed Insights', product: 'Mesure produit Supabase', save: 'Enregistrer mes choix', customize: 'Personnaliser' },
  es: { audience: 'Vercel Web Analytics y Speed Insights', product: 'Medición de producto de Supabase', save: 'Guardar mis elecciones', customize: 'Personalizar' },
  de: { audience: 'Vercel Web Analytics und Speed Insights', product: 'Supabase-Produktmessung', save: 'Meine Auswahl speichern', customize: 'Anpassen' },
  it: { audience: 'Vercel Web Analytics e Speed Insights', product: 'Misurazione del prodotto Supabase', save: 'Salva le mie scelte', customize: 'Personalizza' },
  ja: { audience: 'Vercel Web Analytics と Speed Insights', product: 'Supabase プロダクト測定', save: '選択を保存', customize: 'カスタマイズ' },
  ko: { audience: 'Vercel Web Analytics 및 Speed Insights', product: 'Supabase 제품 측정', save: '선택 저장', customize: '맞춤 설정' },
  zh: { audience: 'Vercel Web Analytics 和 Speed Insights', product: 'Supabase 产品衡量', save: '保存我的选择', customize: '自定义' },
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

function getCurrentLanguage(): SupportedLanguage {
  const candidate = (i18n.language ?? 'en').split('-')[0];
  return isSupportedLanguage(candidate) ? candidate : 'en';
}

export default function CookieBanner() {
  const { t } = useTranslation();
  const language = getCurrentLanguage();
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
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-consent-title"
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
            <h2 id="cookie-consent-title" className="font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {t('legal.banner.title')}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-[0.8125rem]">
              {t('legal.banner.description')}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
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
          <fieldset className="mt-4 space-y-3 rounded-sm border border-border/40 p-3">
            <legend className="px-1 text-sm font-semibold">{t('legal.banner.manage', { defaultValue: 'Manage preferences' })}</legend>
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button type="button" variant="ghost" size="touch" onClick={handleReject}>
            {t('legal.banner.reject', { defaultValue: 'Reject all' })}
          </Button>
          <Button type="button" variant="ghost" size="touch" onClick={() => setCustomizing(true)}>{labels.customize}</Button>
          <Button type="button" variant="default" size="touch" onClick={handleAccept}>
            {t('legal.banner.accept', { defaultValue: 'Accept all' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
