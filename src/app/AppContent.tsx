'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import CompareBarSlot from "@/components/pokemon/CompareBarSlot";
import dynamic from 'next/dynamic';
import { TOAST_REQUEST_EVENT } from '@/lib/toast';

const InstallPrompt = dynamic(() => import("@/components/layout/InstallPrompt").then(m => m.InstallPrompt), { ssr: false });
const DeferredToaster = dynamic(() => import("@/components/ui/sonner").then(m => m.Toaster), { ssr: false });

function ToastBoundary() {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const handleToastRequest = () => setRequested(true);
    window.addEventListener(TOAST_REQUEST_EVENT, handleToastRequest);
    return () => window.removeEventListener(TOAST_REQUEST_EVENT, handleToastRequest);
  }, []);

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
      <CompareBarSlot />
      <ToastBoundary />
      <InstallPrompt />
      {shouldRenderAgentation && Agentation && (
        <Agentation endpoint="http://localhost:4747" />
      )}
    </>
  );
}
