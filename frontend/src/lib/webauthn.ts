"use client";

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://medivault-653s.onrender.com";

export interface UserPasskey {
  id: string;
  credential_id: string;
  device_name: string;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
}

/**
 * Checks if the current browser and OS device support WebAuthn / Passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return Boolean(available);
  } catch {
    return false;
  }
}

/**
 * Register current device as a biometric passkey (Protected - requires user JWT)
 */
export async function registerDevicePasskey(deviceName: string, token: string) {
  // 1. Fetch registration options from backend
  const optionsRes = await fetch(`${API_BASE_URL}/api/auth/webauthn/register-options`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const optionsJson = await optionsRes.json();
  if (!optionsRes.ok || !optionsJson.success) {
    throw new Error(optionsJson.message || "Failed to initiate passkey registration.");
  }

  // 2. Prompt native device hardware sensor (Face ID, Touch ID, Windows Hello)
  let attResp;
  try {
    attResp = await startRegistration({ optionsJSON: optionsJson.data });
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric enrollment was cancelled or timed out.");
    }
    throw new Error(err.message || "Failed to capture biometric credentials.");
  }

  // 3. Send attestation response back to server for verification and storage
  const verifyRes = await fetch(`${API_BASE_URL}/api/auth/webauthn/register-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      response: attResp,
      deviceName: deviceName || "Biometric Device",
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson.success) {
    throw new Error(verifyJson.message || "Failed to verify biometric registration.");
  }

  return verifyJson.data;
}

/**
 * 1-Tap Biometric Login with Passkey (Public - prompts hardware sensor and returns session)
 */
export async function loginWithBiometrics(email?: string) {
  // 1. Fetch authentication challenge from backend
  const optionsRes = await fetch(`${API_BASE_URL}/api/auth/webauthn/login-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email?.trim() || undefined }),
  });

  const optionsJson = await optionsRes.json();
  if (!optionsRes.ok || !optionsJson.success) {
    throw new Error(optionsJson.message || "Failed to initiate biometric login.");
  }

  // 2. Prompt native device hardware sensor
  let assertionResp;
  try {
    assertionResp = await startAuthentication({ optionsJSON: optionsJson.data });
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric scan was cancelled.");
    }
    throw new Error(err.message || "Biometric verification failed.");
  }

  // 3. Verify assertion with server and receive session token
  const verifyRes = await fetch(`${API_BASE_URL}/api/auth/webauthn/login-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: assertionResp }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson.success) {
    throw new Error(verifyJson.message || "Biometric verification failed.");
  }

  return verifyJson.data as {
    token: string;
    user: {
      id: string;
      email: string;
      full_name?: string;
      role: string;
    };
    role: string;
  };
}

/**
 * Retrieve all registered passkeys for the current user
 */
export async function listUserPasskeys(token: string): Promise<UserPasskey[]> {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/passkeys`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load passkeys.");
  }
  return json.data || [];
}

/**
 * Revoke/delete a passkey
 */
export async function deleteUserPasskey(passkeyId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/passkeys/${passkeyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  return Boolean(res.ok && json.success);
}
