"use client";

import { supabase } from "./supabase";

/**
 * Returns the active authentication token from either:
 * 1. Supabase Auth session (Email/Password or Google OAuth)
 * 2. MediVault WebAuthn Passkey session (localStorage)
 * 3. MediVault Demo JWT session (localStorage)
 */
export async function getAuthToken(): Promise<string | null> {
  // 1. Check Supabase session
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {}

  // 2. Check localStorage (for WebAuthn passkey or demo logins)
  if (typeof window !== "undefined") {
    const passkeyToken = localStorage.getItem("medivault_auth_token");
    if (passkeyToken) return passkeyToken;

    const demoToken = localStorage.getItem("medivault_demo_jwt");
    if (demoToken) return demoToken;
  }

  return null;
}

/**
 * Returns HTTP headers containing the active Bearer token and user role.
 * By default includes "Content-Type": "application/json".
 * Pass isFormData = true to omit Content-Type so browsers automatically calculate multipart boundaries.
 */
export async function getAuthHeaders(
  additionalHeaders?: Record<string, string>,
  isFormData = false
): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    ...(additionalHeaders || {}),
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (typeof window !== "undefined") {
    const role = localStorage.getItem("medivault_user_role");
    if (role) {
      headers["x-user-role"] = role;
    }
  }

  return headers;
}

/**
 * Returns HTTP headers suitable for multipart FormData uploads
 * (omits Content-Type so browser sets boundary automatically).
 */
export async function getFormDataAuthHeaders(
  additionalHeaders?: Record<string, string>
): Promise<Record<string, string>> {
  return getAuthHeaders(additionalHeaders, true);
}
