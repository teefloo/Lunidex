"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("primedex-pwa-dismissed", "1");
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("primedex-pwa-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <Image src="/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">Install PrimeDex</p>
        <p className="text-muted-foreground">Add to your home screen for the best experience.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Not Now
        </Button>
        <Button variant="default" size="sm" onClick={handleInstall}>
          Install
        </Button>
      </div>
    </div>
  );
}
