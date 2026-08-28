"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Fingerprint, 
  Smartphone, 
  Laptop, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Loader2,
  KeyRound
} from "lucide-react";
import { 
  isPasskeySupported, 
  registerDevicePasskey, 
  listUserPasskeys, 
  deleteUserPasskey, 
  UserPasskey 
} from "@/lib/webauthn";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://medivault-653s.onrender.com";

interface PasskeyManagerCardProps {
  userId: string;
  token?: string;
}

export const PasskeyManagerCard: React.FC<PasskeyManagerCardProps> = ({
  userId,
  token,
}) => {
  const { success, error: showError } = useToast();
  const { session, user, isDemo, role } = useAuth();

  const [supported, setSupported] = useState<boolean>(false);
  const [passkeys, setPasskeys] = useState<UserPasskey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [activeToken, setActiveToken] = useState<string | null>(token || null);

  // Check hardware WebAuthn support
  useEffect(() => {
    isPasskeySupported().then(setSupported);
  }, []);

  /**
   * Resiliently resolve a valid JWT session token:
   * 1. Prop token
   * 2. Supabase active session token
   * 3. LocalStorage medivault_auth_token
   * 4. Demo token generation for demo users
   */
  const resolveToken = useCallback(async (): Promise<string | null> => {
    if (activeToken) return activeToken;
    if (token) {
      setActiveToken(token);
      return token;
    }

    // 1. Check Supabase active session
    if (session?.access_token) {
      setActiveToken(session.access_token);
      return session.access_token;
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setActiveToken(data.session.access_token);
        return data.session.access_token;
      }
    } catch {}

    // 2. Check localStorage medivault_auth_token
    if (typeof window !== "undefined") {
      const localToken = localStorage.getItem("medivault_auth_token");
      if (localToken) {
        setActiveToken(localToken);
        return localToken;
      }

      // 3. Demo mode fallback: Request a demo session token from backend
      const isDemoMode = isDemo || localStorage.getItem("medivault_is_demo") === "true";
      if (isDemoMode) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/demo-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: role || localStorage.getItem("medivault_user_role") || "patient" }),
          });
          const json = await res.json();
          if (json.success && json.data?.token) {
            localStorage.setItem("medivault_auth_token", json.data.token);
            setActiveToken(json.data.token);
            return json.data.token;
          }
        } catch (e) {
          console.warn("Could not get demo token:", e);
        }
      }
    }

    return null;
  }, [activeToken, token, session, isDemo, role]);

  const fetchPasskeys = useCallback(async () => {
    const effectiveToken = await resolveToken();
    if (!effectiveToken) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const list = await listUserPasskeys(effectiveToken);
      setPasskeys(list);
    } catch (err: any) {
      console.warn("[PasskeyManager] Could not load passkeys:", err);
    } finally {
      setIsLoading(false);
    }
  }, [resolveToken]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  // Handle new passkey registration
  const handleRegister = async () => {
    const effectiveToken = await resolveToken();
    if (!effectiveToken) {
      showError("Session Required", "Please re-login or refresh your session to enroll biometric passkeys.");
      return;
    }

    const defaultName = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      ? "Mobile Phone (Face ID / Fingerprint)"
      : "Personal Workstation (Touch ID / Hello)";

    const name = deviceNameInput.trim() || defaultName;

    try {
      setIsRegistering(true);
      await registerDevicePasskey(name, effectiveToken);
      success("Passkey Enrolled!", `"${name}" is now registered for 1-tap biometric sign-in.`);
      setShowAddModal(false);
      setDeviceNameInput("");
      await fetchPasskeys();
    } catch (err: any) {
      showError("Enrollment Failed", err.message || "Could not register biometric passkey.");
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle passkey revocation
  const handleDelete = async (id: string, name: string) => {
    const effectiveToken = await resolveToken();
    if (!effectiveToken) return;
    if (!confirm(`Are you sure you want to revoke passkey "${name}"?`)) return;

    try {
      setDeletingId(id);
      await deleteUserPasskey(id, effectiveToken);
      success("Passkey Revoked", `"${name}" has been removed.`);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      showError("Action Failed", err.message || "Failed to remove passkey.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#0D9488] text-white shadow-md shadow-cyan-500/20">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Biometric Passkeys &amp; Fast Login</span>
              {supported && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  Hardware Ready
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              1-tap login with Apple Face ID, Touch ID, Android Fingerprint, or Windows Hello.
            </p>
          </div>
        </div>

        {supported ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Biometric Passkey</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>Hardware Not Available in Current Browser</span>
          </div>
        )}
      </div>

      {/* Passkeys List */}
      {isLoading ? (
        <div className="py-6 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#0891B2]" />
          <span>Loading registered passkeys...</span>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
          <KeyRound className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-800">No Passkeys Registered Yet</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Enroll your smartphone or laptop so you can sign in to MediVault in 1 second without typing passwords.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {passkeys.map((pk) => {
            const isPhone = /phone|android|mobile|ios|iphone/i.test(pk.device_name);
            const DeviceIcon = isPhone ? Smartphone : Laptop;
            return (
              <div
                key={pk.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{pk.device_name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Enrolled on {new Date(pk.created_at).toLocaleDateString()}
                      {pk.last_used_at && (
                        <span> • Last used {new Date(pk.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(pk.id, pk.device_name)}
                  disabled={deletingId === pk.id}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Revoke passkey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-50 text-[#0891B2]">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Enroll Biometric Passkey</h4>
                <p className="text-xs text-slate-500">Your biometric data stays private on your hardware.</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700">Device Nickname</label>
              <input
                type="text"
                placeholder="e.g. My iPhone 15 Pro, ANIKET Phone, Work Laptop"
                value={deviceNameInput}
                onChange={(e) => setDeviceNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={isRegistering}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={isRegistering}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold shadow-md shadow-cyan-500/25 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Prompting Biometric Sensor...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Scan Sensor to Enroll</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
