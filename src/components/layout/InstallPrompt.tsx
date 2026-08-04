"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Plus, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPromptMode = "android" | "ios-safari" | "ios-browser";

type NavigatorPlatform = Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">;

const DISMISSED_KEY = "primedex-pwa-dismissed";

export function detectInstallPromptMode(
  navigatorValue: NavigatorPlatform,
  isStandalone: boolean,
): InstallPromptMode | null {
  if (isStandalone) return null;

  const userAgent = navigatorValue.userAgent;
  const isIos = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigatorValue.platform === "MacIntel" && navigatorValue.maxTouchPoints > 1);

  if (!isIos) return null;

  const isSafari = /Safari/i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(userAgent);

  return isSafari ? "ios-safari" : "ios-browser";
}

function isAndroidDevice(navigatorValue: NavigatorPlatform): boolean {
  return /Android/i.test(navigatorValue.userAgent);
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;

  const mediaQuery = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return mediaQuery || navigatorWithStandalone.standalone === true;
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Session storage can be unavailable in private browsing.
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallPromptMode | null>(() => {
    if (typeof navigator === "undefined" || isDismissed()) return null;
    return detectInstallPromptMode(navigator, isStandaloneDisplayMode());
  });
  const [visible, setVisible] = useState(() => mode !== null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { t } = useTranslation();

  const safariUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const { host, pathname, search, hash } = window.location;
    return `x-safari-https://${host}${pathname}${search}${hash}`;
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    markDismissed();
  }, []);

  useEffect(() => {
    if (isDismissed() || mode) return;

    const standalone = isStandaloneDisplayMode();
    if (standalone) return;
    if (!isAndroidDevice(navigator)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
      setVisible(true);
    };
    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [mode]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setVisible(false);
      setDeferredPrompt(null);
    } catch {
      // The browser may reject the prompt if it was already consumed.
    }
  }, [deferredPrompt]);

  const handleOpenSafari = useCallback(() => {
    if (!safariUrl) return;
    window.open(safariUrl, "_blank", "noopener,noreferrer");
  }, [safariUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Clipboard access may be denied; the Safari instructions remain visible.
    }
  }, []);

  if (!visible || !mode) return null;

  const isAndroid = mode === "android";
  const isIosSafari = mode === "ios-safari";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="pwa-install-title"
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <Image src="/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p id="pwa-install-title" className="font-semibold text-foreground">
            {isAndroid
              ? t("pwa.install_title", { defaultValue: "Install Lunidex" })
              : t("pwa.ios_title", { defaultValue: "Install Lunidex on your iPhone" })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {isAndroid
              ? t("pwa.install_description", { defaultValue: "Add Lunidex to your home screen for a faster, app-like experience." })
              : isIosSafari
                ? t("pwa.ios_safari_description", { defaultValue: "Tap Share, then choose Add to Home Screen to install Lunidex." })
                : t("pwa.ios_browser_description", { defaultValue: "Open this page in Safari to install Lunidex on your home screen." })}
          </p>
        </div>
      </div>

      {!isAndroid && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">
          {isIosSafari ? (
            <>
              <Share className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t("pwa.ios_share_step", { defaultValue: "Share" })}</span>
              <span aria-hidden="true">→</span>
              <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t("pwa.ios_home_screen_step", { defaultValue: "Add to Home Screen" })}</span>
            </>
          ) : (
            <>
              <ExternalLink className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t("pwa.ios_safari_required", { defaultValue: "Safari is required for this installation." })}</span>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="touch" onClick={handleDismiss}>
          {t("pwa.dismiss_action", { defaultValue: "Not now" })}
        </Button>
        {isAndroid ? (
          <Button type="button" variant="default" size="touch" onClick={handleInstall}>
            {t("pwa.install_action", { defaultValue: "Install" })}
          </Button>
        ) : isIosSafari ? (
          <Button type="button" variant="default" size="touch" onClick={handleDismiss}>
            {t("pwa.ios_done", { defaultValue: "Got it" })}
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="touch" onClick={handleCopyLink}>
              {linkCopied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {linkCopied
                ? t("pwa.ios_link_copied", { defaultValue: "Link copied" })
                : t("pwa.ios_copy_link", { defaultValue: "Copy link" })}
            </Button>
            <Button type="button" variant="default" size="touch" onClick={handleOpenSafari}>
              <ExternalLink className="size-4" aria-hidden="true" />
              {t("pwa.ios_open_safari", { defaultValue: "Open in Safari" })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
