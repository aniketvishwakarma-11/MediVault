"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BAUdKHC89_8AHtt8Z5K-fjxdkWfChbd9gmFQWXZWnZfqIj-TSwQPLoqCs_DCY_dw4-f0aSxV3VwJw6k1sdQvdhY";

export interface SubscribeResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export function usePushNotifications() {
  const { session } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const getAuthToken = useCallback(async () => {
    if (session?.access_token) return session.access_token;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [session]);

  // Check support and existing subscription status
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(Boolean(sub));
        });
      });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    if (!isSupported) {
      return { ok: false, error: "NOT_SUPPORTED", message: "Push notifications are not supported by this browser." };
    }

    try {
      setLoading(true);

      // 1. Request Browser Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return {
          ok: false,
          error: "PERMISSION_DENIED",
          message: "Notification permission was blocked or denied in device settings.",
        };
      }

      // 2. Resolve VAPID Public Key (with static fallback)
      let publicKey = DEFAULT_VAPID_PUBLIC_KEY;
      try {
        const keyRes = await fetch(`${API_BASE_URL}/api/notifications/vapid-key`);
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          publicKey = keyData.data?.publicKey || keyData.publicKey || DEFAULT_VAPID_PUBLIC_KEY;
        }
      } catch (fetchErr) {
        console.warn("[usePushNotifications] VAPID endpoint offline/warming, using verified fallback key.");
      }

      // 3. Register with Browser Push Service
      const reg = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(publicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey.buffer as ArrayBuffer,
        });
      }

      // 4. Send Subscription to Backend
      try {
        const token = await getAuthToken();
        await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            subscription: sub.toJSON(),
          }),
        });
      } catch (backendErr) {
        console.warn("[usePushNotifications] Backend sync delayed:", backendErr);
      }

      setIsSubscribed(true);
      return { ok: true, message: "Push notifications enabled successfully." };
    } catch (err: any) {
      console.error("[usePushNotifications] Subscription error:", err);
      return { ok: false, error: "REGISTRATION_ERROR", message: err.message || "Failed to register push subscription." };
    } finally {
      setLoading(false);
    }
  }, [isSupported, getAuthToken]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        const token = await getAuthToken();
        await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("[usePushNotifications] Unsubscribe failed:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/notifications/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      return data.success;
    } catch (err) {
      console.error("[usePushNotifications] Test push failed:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
