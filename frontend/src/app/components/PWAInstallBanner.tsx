"use client";

import React from "react";
import { Download, X, ShieldCheck, Sparkles } from "lucide-react";
import { usePWA } from "./PWAProvider";

export default function PWAInstallBanner() {
  const { showInstallBanner, isInstallable, installApp, dismissInstallPrompt } = usePWA();

  if (!showInstallBanner || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-cyan-200/90 shadow-xl shadow-cyan-900/10 p-4 animate-in slide-in-from-bottom-5 duration-300 font-body">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0 font-heading">
          <ShieldCheck className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-heading font-bold text-xs text-[#0F172A]">Install MediVault App</h4>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-50 text-[#0891B2] border border-cyan-200 uppercase">PWA</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">
            Add to your home screen for instant 1-tap launch & offline Emergency ID access.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={installApp}
              className="px-3.5 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer min-h-[36px]"
            >
              Not Now
            </button>
          </div>
        </div>

        <button
          onClick={dismissInstallPrompt}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
