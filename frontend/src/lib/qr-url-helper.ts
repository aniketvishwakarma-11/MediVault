// MediVault — Emergency QR URL Normalizer
// Dynamically resolves QR URLs using the current active origin (localhost or production domain)
// Eliminates cross-origin mismatches while avoiding hardcoded URLs.

export function getFrontendOrigin(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
}

/**
 * Normalizes any emergency QR URL to match the currently running environment.
 * If running on localhost, keeps/rewrites to localhost.
 * If running on a deployed domain (Vercel, custom domain, etc.), keeps/rewrites to that domain.
 */
export function normalizeEmergencyQrUrl(
  rawUrl?: string | null,
  fallbackTokenOrId?: string | null
): string {
  const currentOrigin = getFrontendOrigin();

  if (rawUrl && typeof rawUrl === "string") {
    // Relative path (/e/...)
    if (rawUrl.startsWith("/")) {
      return `${currentOrigin}${rawUrl}`;
    }

    try {
      const parsed = new URL(rawUrl);
      // If the URL host differs from current window origin (e.g. cached from different environment)
      if (typeof window !== "undefined" && parsed.origin !== window.location.origin) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }
      return rawUrl;
    } catch {
      return `${currentOrigin}/e/${fallbackTokenOrId || ""}`;
    }
  }

  // If no rawUrl, build from token or credentialId
  if (fallbackTokenOrId) {
    return `${currentOrigin}/e/${fallbackTokenOrId}`;
  }

  return `${currentOrigin}/patient/emergency`;
}

/**
 * Scans localStorage and ensures cached QR URLs match the active origin.
 */
export function cleanLocalStorageQrUrls(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToClean: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("medivault_qr_url_") || key === "medivault_offline_emergency_snapshot")) {
        keysToClean.push(key);
      }
    }

    for (const key of keysToClean) {
      const val = localStorage.getItem(key);
      if (val) {
        if (key === "medivault_offline_emergency_snapshot") {
          try {
            const parsed = JSON.parse(val);
            if (parsed?.credential?.qrUrl) {
              parsed.credential.qrUrl = normalizeEmergencyQrUrl(parsed.credential.qrUrl, parsed.credential.id);
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch {}
        } else {
          const cleaned = normalizeEmergencyQrUrl(val);
          if (cleaned !== val) {
            localStorage.setItem(key, cleaned);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[QR Helper] Error syncing legacy localStorage URLs:", err);
  }
}
