"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);

  // 1. Service Worker & Connectivity Registration
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      setHasOfflineSnapshot(OfflineEmergencyVault.hasSnapshot());

      // Check if already running in standalone PWA mode
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      setIsInstalled(!!isStandalone);
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker active:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration:", err);
        });
    }

    // Capture beforeinstallprompt (Fires when the app is NOT installed on the device)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setIsInstalled(false); // If browser fires this, the app is not currently installed
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

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

  // 2. Show install banner every time user visits the homepage (if not installed)
  useEffect(() => {
    if (pathname === "/" && !isInstalled) {
      const timer = setTimeout(() => {
        // Show on homepage if install prompt available or supported
        setShowInstallBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowInstallBanner(false);
    }
  }, [pathname, isInstalled, isInstallable]);

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
    // Dismiss for this immediate view without permanently blocking next visit to homepage
    setShowInstallBanner(false);
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable: isInstallable || !!deferredPrompt,
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
