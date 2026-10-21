'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import CompareBarSlot from "@/components/pokemon/CompareBarSlot";
import { PrimaryBottomNav } from '@/components/layout/PrimaryBottomNav';
import dynamic from 'next/dynamic';
import { TOAST_REQUEST_EVENT } from '@/lib/toast';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';
import { PERSISTENCE_ERROR_EVENT } from '@/store/persistence';

const InstallPrompt = dynamic(() => import("@/components/layout/InstallPrompt").then(m => m.InstallPrompt), { ssr: false });
const DeferredToaster = dynamic(() => import("@/components/ui/sonner").then(m => m.Toaster), { ssr: false });
const AGENTATION_ENDPOINT = "http://localhost:4747";

function ToastBoundary() {
  const { t } = useTranslation();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const handleToastRequest = () => setRequested(true);
    const handlePersistenceError = () => {
      toast.warning(t('common.local_save_failed'));
    };
    window.addEventListener(TOAST_REQUEST_EVENT, handleToastRequest);
    window.addEventListener(PERSISTENCE_ERROR_EVENT, handlePersistenceError);
    return () => {
      window.removeEventListener(TOAST_REQUEST_EVENT, handleToastRequest);
      window.removeEventListener(PERSISTENCE_ERROR_EVENT, handlePersistenceError);
    };
  }, [t]);

  return requested ? <DeferredToaster /> : null;
}

export function AppContent({ children }: { children: ReactNode }) {
  const shouldRenderAgentation = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "true";
  const [Agentation, setAgentation] = useState<ComponentType<{ endpoint: string }> | null>(null);

  useEffect(() => {
    if (!shouldRenderAgentation) return;

    let cancelled = false;

    void import("agentation")
      .then((module) => {
        if (cancelled) return;
        setAgentation(() => module.Agentation as ComponentType<{ endpoint: string }>);
      })
      .catch((error) => {
        console.error("Failed to load Agentation:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldRenderAgentation]);
  
  return (
    <>
      {children}
      <PrimaryBottomNav />
      <CompareBarSlot />
      <ToastBoundary />
      <InstallPrompt />
      {shouldRenderAgentation && Agentation && (
        <Agentation endpoint={AGENTATION_ENDPOINT} />
      )}
    </>
  );
}
