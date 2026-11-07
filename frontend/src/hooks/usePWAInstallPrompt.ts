import { useState, useEffect, useCallback } from "react";

const DISMISSAL_KEY = "pennypilot_pwa_install_dismissed";
const DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days cooldown after dismissal

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isDismissed: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
}

export function usePWAInstallPrompt(): PWAInstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isNavStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone || isNavStandalone;
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
      if (!dismissedAt) return false;
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      return elapsed < DISMISSAL_COOLDOWN_MS;
    } catch {
      return false;
    }
  });

  const [isIOS] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|crmo|android/.test(ua);
    return isAppleDevice && isSafari;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if display mode changes to standalone
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISSAL_KEY);
      } catch {
        // Ignore localStorage error
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      } else {
        dismissPrompt();
        return false;
      }
    } catch {
      return false;
    }
  }, [deferredPrompt, dismissPrompt]);

  const isInstallable = (!isInstalled && !isDismissed && (!!deferredPrompt || isIOS));

  return {
    isInstallable,
    isInstalled,
    isIOS: isIOS && !isInstalled,
    isDismissed,
    promptInstall,
    dismissPrompt,
  };
}
