// MediVault — Emergency QR URL Normalizer
// Guarantees all emergency QR codes encode the live production URL and eliminates any localhost references.

export function getProductionFrontendOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin;
    }
  }
  return process.env.NEXT_PUBLIC_FRONTEND_URL || "https://medi-vault-seven-lyart.vercel.app";
}

/**
 * Normalizes any emergency QR URL to use the correct live frontend origin.
 * Automatically cleans localhost / 127.0.0.1 references.
 */
export function normalizeEmergencyQrUrl(
  rawUrl?: string | null,
  fallbackTokenOrId?: string | null
): string {
  const prodOrigin = getProductionFrontendOrigin();

  if (rawUrl && typeof rawUrl === "string") {
    // If it's a localhost / 127.0.0.1 URL, extract path and rebuild with production origin
    if (rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")) {
      try {
        const parsed = new URL(rawUrl);
        return `${prodOrigin}${parsed.pathname}${parsed.search}`;
      } catch {
        return rawUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, prodOrigin);
      }
    }

    // If it's a relative path
    if (rawUrl.startsWith("/")) {
      return `${prodOrigin}${rawUrl}`;
    }

    // Valid absolute URL
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return rawUrl;
    }
  }

  // If no rawUrl, build from token or credentialId
  if (fallbackTokenOrId) {
    return `${prodOrigin}/e/${fallbackTokenOrId}`;
  }

  return `${prodOrigin}/patient/emergency`;
}

/**
 * Scans localStorage and cleans any legacy localhost QR URLs
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
      if (val && (val.includes("localhost") || val.includes("127.0.0.1"))) {
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
          localStorage.setItem(key, cleaned);
        }
      }
    }
  } catch (err) {
    console.warn("[QR Helper] Error cleaning legacy localStorage URLs:", err);
  }
}
