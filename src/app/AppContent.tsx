'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import CompareBarSlot from "@/components/pokemon/CompareBarSlot";
import dynamic from 'next/dynamic';
import { TOAST_REQUEST_EVENT } from '@/lib/toast';

const InstallPrompt = dynamic(() => import("@/components/layout/InstallPrompt").then(m => m.InstallPrompt), { ssr: false });
const DeferredToaster = dynamic(() => import("@/components/ui/sonner").then(m => m.Toaster), { ssr: false });
const AGENTATION_ENDPOINT = "http://localhost:4747";

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
  const [agentationAvailable, setAgentationAvailable] = useState(false);
  const [Agentation, setAgentation] = useState<ComponentType<{ endpoint: string }> | null>(null);

  useEffect(() => {
    if (!shouldRenderAgentation) {
      setAgentationAvailable(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1_500);

    void fetch('/api/agentation/health', {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          if (active) setAgentationAvailable(false);
          return;
        }
        const result = await response.json().catch(() => null) as { available?: unknown } | null;
        if (active) setAgentationAvailable(result?.available === true);
      })
      .catch(() => {
        // Agentation is an optional development tool. Its absence must not
        // add console noise or place an interaction-blocking overlay above
        // the application.
        if (active) setAgentationAvailable(false);
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [shouldRenderAgentation]);

  useEffect(() => {
    if (!shouldRenderAgentation || !agentationAvailable) return;

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
  }, [agentationAvailable, shouldRenderAgentation]);
  
  return (
    <>
      {children}
      <CompareBarSlot />
      <ToastBoundary />
      <InstallPrompt />
      {shouldRenderAgentation && agentationAvailable && Agentation && (
        <Agentation endpoint={AGENTATION_ENDPOINT} />
      )}
    </>
  );
}
