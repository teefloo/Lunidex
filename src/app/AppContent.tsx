'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import CompareBarSlot from "@/components/pokemon/CompareBarSlot";
import { Toaster } from "@/components/ui/sonner";

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
      <Toaster />
      {shouldRenderAgentation && Agentation && (
        <Agentation endpoint="http://localhost:4747" />
      )}
    </>
  );
}
