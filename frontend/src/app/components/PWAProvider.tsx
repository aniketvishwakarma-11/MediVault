"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { WifiOff, Download, X, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { OfflineEmergencyVault } from "@/lib/offline-emergency-vault";

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  hasOfflineSnapshot: boolean;
  installApp: () => Promise<void>;
  dismissInstallPrompt: () => void;
  showInstallBanner: boolean;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  hasOfflineSnapshot: false,
  installApp: async () => {},
  dismissInstallPrompt: () => {},
  showInstallBanner: false,
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);

  useEffect(() => {
    // 1. Initial State
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      setHasOfflineSnapshot(OfflineEmergencyVault.hasSnapshot());

      // Check if already installed (standalone mode)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      setIsInstalled(!!isStandalone);

      // Check if user dismissed prompt in this session
      const dismissed = sessionStorage.getItem("medivault_pwa_prompt_dismissed");
      if (!dismissed && !isStandalone) {
        // Will be shown if beforeinstallprompt fires
      }
    }

    // 2. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // 3. Listen for BeforeInstallPrompt event (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      const dismissed = sessionStorage.getItem("medivault_pwa_prompt_dismissed");
      if (!dismissed) {
        // Give the user a few seconds to experience the app before prompting
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    // 4. Listen for AppInstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log("[PWA] App successfully installed!");
    };

    // 5. Connectivity Listeners
    const unsubscribeConnectivity = OfflineEmergencyVault.subscribeConnectivity((online) => {
      setIsOffline(!online);
      setHasOfflineSnapshot(OfflineEmergencyVault.hasSnapshot());
    });

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      unsubscribeConnectivity();
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("[PWA] Install prompt error:", err);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallBanner(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("medivault_pwa_prompt_dismissed", "true");
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isOffline,
        hasOfflineSnapshot,
        installApp,
        dismissInstallPrompt,
        showInstallBanner,
      }}
    >
      {/* Global Offline Status Toast Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You are currently in <strong>Offline Mode</strong>.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasOfflineSnapshot && (
              <Link
                href="/patient/emergency"
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Open Offline Emergency Pass</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {children}
    </PWAContext.Provider>
  );
}
