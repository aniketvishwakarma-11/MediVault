// MediVault Offline Emergency Vault
// Stores emergency credentials, blood group, allergies, medications, and QR data for offline availability

import { EmergencyCredential, EmergencyProfileSettings, EmergencyContactItem } from "./emergency-api";

export interface OfflineEmergencyPayload {
  credential: EmergencyCredential | null;
  profileSettings: EmergencyProfileSettings | null;
  contacts: EmergencyContactItem[];
  patientName: string;
  uhid: string;
  bloodGroup: string;
  lastSyncedAt: string;
}

const STORAGE_KEY = "medivault_offline_emergency_snapshot";

export const OfflineEmergencyVault = {
  /**
   * Persists latest emergency profile and credential snapshot to on-device storage
   */
  saveSnapshot(payload: {
    credential?: EmergencyCredential | null;
    profileSettings?: EmergencyProfileSettings | null;
    contacts?: EmergencyContactItem[];
    patientName?: string;
    uhid?: string;
    bloodGroup?: string;
  }): void {
    if (typeof window === "undefined") return;

    try {
      const existing = OfflineEmergencyVault.getSnapshot();
      const merged: OfflineEmergencyPayload = {
        credential: payload.credential !== undefined ? payload.credential : existing?.credential ?? null,
        profileSettings: payload.profileSettings !== undefined ? payload.profileSettings : existing?.profileSettings ?? null,
        contacts: payload.contacts !== undefined ? payload.contacts : existing?.contacts ?? [],
        patientName: payload.patientName || existing?.patientName || "Patient Identity",
        uhid: payload.uhid || existing?.uhid || "",
        bloodGroup: payload.bloodGroup || existing?.bloodGroup || "",
        lastSyncedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.warn("[OfflineVault] Failed to save offline snapshot:", err);
    }
  },

  /**
   * Retrieves the locally cached emergency snapshot
   */
  getSnapshot(): OfflineEmergencyPayload | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as OfflineEmergencyPayload;
    } catch (err) {
      console.warn("[OfflineVault] Failed to read offline snapshot:", err);
      return null;
    }
  },

  /**
   * Checks if an offline snapshot is available on device
   */
  hasSnapshot(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Clears the cached offline snapshot (e.g. on logout)
   */
  clearSnapshot(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Checks whether the current environment is offline
   */
  isOffline(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return !navigator.onLine;
  },

  /**
   * Subscribes to browser online/offline connectivity changes
   */
  subscribeConnectivity(callback: (online: boolean) => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }
};
