"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/context/ToastContext";

export default function PushNotificationBanner() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const { success: showSuccess, error: showError } = useToast();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("medivault_push_banner_dismissed");
      if (!isDismissed) {
        setDismissed(false);
      }
    }
  }, []);

  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("medivault_push_banner_dismissed", "true");
    }
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      showSuccess("Notifications Enabled", "You will receive instant alerts for doctor requests & medication alarms.");
      setDismissed(true);
    } else {
      showError("Action Cancelled", "Push notification permissions were not granted.");
    }
  };

  return (
    <div className="relative mb-6 rounded-2xl bg-gradient-to-r from-cyan-900/90 via-slate-900/95 to-slate-900 border border-cyan-500/30 p-4 sm:p-5 text-white shadow-lg overflow-hidden backdrop-blur-md">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 text-cyan-300 shadow-inner">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm sm:text-base text-white">
                Enable Instant Medical Alerts
              </h4>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> VAPID SECURE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Get notified immediately when doctors request record consent, when AI finishes analyzing your reports, and receive daily medication dosage reminders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t border-slate-700/60 sm:border-t-0">
          <button
            onClick={handleDismiss}
            className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Connecting...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Enable Alerts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
