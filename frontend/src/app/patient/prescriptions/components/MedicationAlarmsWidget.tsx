"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellRing,
  Clock,
  CheckCircle2,
  RefreshCw,
  Zap,
  ShieldCheck,
  Power,
  Pill,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ReminderItem {
  id: string;
  drug_name: string;
  dosage: string;
  reminder_time: string;
  instructions: string;
  is_active: boolean;
}

export default function MedicationAlarmsWidget() {
  const { isSupported, isSubscribed, loading: pushLoading, subscribe, sendTestNotification } =
    usePushNotifications();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/notifications/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.reminders)) {
        setReminders(json.data.reminders);
      }
    } catch (err) {
      console.warn("[MedicationAlarmsWidget] Fetch reminders notice:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      // Optimistic update
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r))
      );

      await fetch(`${API_BASE_URL}/api/notifications/reminders/${id}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      showSuccess(
        !currentStatus ? "Alarm Activated" : "Alarm Paused",
        `Medication reminder ${!currentStatus ? "enabled" : "paused"}.`
      );
    } catch {
      showError("Update Failed", "Could not update reminder status.");
      fetchReminders();
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/notifications/reminders/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      await fetchReminders();
      showSuccess(
        "Alarms Synchronized",
        `Synchronized ${json.data?.synced || 0} medication reminders from your prescriptions.`
      );
    } catch {
      showError("Sync Failed", "Could not synchronize reminders.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTest = async () => {
    if (!isSubscribed) {
      showInfo("Enable Push First", "Please click 'Enable Device Push' before testing alerts.");
      return;
    }

    try {
      setTesting(true);
      const ok = await sendTestNotification();
      if (ok) {
        showSuccess("Test Notification Dispatched", "Check your device lock screen or browser notification shade!");
      } else {
        showError("Test Failed", "Could not dispatch test push notification.");
      }
    } catch {
      showError("Error", "Failed to send test push.");
    } finally {
      setTesting(false);
    }
  };

  const handleEnablePush = async () => {
    const ok = await subscribe();
    if (ok) {
      showSuccess("Push Notifications Enabled", "You will now receive daily medication alarms on this device.");
    } else {
      showError("Permission Denied", "Please allow notifications in your browser settings.");
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center shrink-0 border border-cyan-100">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm sm:text-base text-[#0F172A]">
                Automated Daily Medication Alarms
              </h3>
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Push Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Device Unlinked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced with doctor prescriptions to dispatch background smartphone alarms.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isSubscribed && isSupported && (
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{pushLoading ? "Enabling..." : "Enable Device Push"}</span>
            </button>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            title="Scan your active prescriptions to create daily dose alarms"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>Sync Alarms</span>
          </button>

          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs transition-colors"
            title="Dispatch an instant test notification to this device"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>{testing ? "Testing..." : "Test Push"}</span>
          </button>
        </div>
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading scheduled alarms...</div>
      ) : reminders.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
          <Pill className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">No active medication alarms set yet</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Click <strong>Sync Alarms</strong> above to automatically generate morning, afternoon, and evening push alarms from your prescriptions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reminders.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                item.is_active
                  ? "bg-slate-50/70 border-slate-200"
                  : "bg-slate-100/50 border-slate-200/50 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-100/70 text-[#0891B2] font-mono text-[11px] font-bold">
                    <Clock className="w-3 h-3" />
                    {item.reminder_time}
                  </span>
                  <span className="font-heading font-bold text-xs text-slate-900 line-clamp-1">
                    {item.drug_name}
                  </span>
                </div>
                {item.dosage && (
                  <p className="text-[11px] text-slate-500 font-medium">{item.dosage}</p>
                )}
                {item.instructions && (
                  <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                    {item.instructions}
                  </p>
                )}
              </div>

              {/* Toggle Active Button */}
              <button
                onClick={() => handleToggle(item.id, item.is_active)}
                className={`p-1.5 rounded-xl border transition-colors shrink-0 ${
                  item.is_active
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300"
                }`}
                title={item.is_active ? "Alarm is Active (Click to Pause)" : "Alarm Paused (Click to Enable)"}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
