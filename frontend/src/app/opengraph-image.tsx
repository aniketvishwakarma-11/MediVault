import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MediVault Chain AI — Digital Health Identity Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(8, 145, 178, 0.35) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(13, 148, 136, 0.35) 0%, transparent 50%)",
          padding: "60px 80px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Top Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 24px",
            borderRadius: "9999px",
            backgroundColor: "rgba(8, 145, 178, 0.2)",
            border: "1.5px solid rgba(8, 145, 178, 0.4)",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "9999px",
              backgroundColor: "#10B981",
            }}
          />
          <span
            style={{
              color: "#38BDF8",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Digital Health Identity Platform
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "64px",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          MediVault <span style={{ color: "#06B6D4", marginLeft: "16px" }}>Chain AI</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "26px",
            fontWeight: 500,
            color: "#94A3B8",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.4,
            marginBottom: "40px",
          }}
        >
          Patient-Owned Medical Records · AI Prescription Scanner · Emergency Break-Glass QR
        </div>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {["HIPAA & GDPR Ready", "Polygon Blockchain Audit", "Zero-Knowledge Consent"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  padding: "10px 20px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#E2E8F0",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
