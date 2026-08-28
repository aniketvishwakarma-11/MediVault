import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { MaintenanceGuard } from "@/app/components/MaintenanceGuard";
import { PWAProvider } from "@/app/components/PWAProvider";
import PWAInstallBanner from "@/app/components/PWAInstallBanner";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { MotionConfig } from "motion/react";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://medi-vault-seven-lyart.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0891B2",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "MediVault Chain AI — Digital Health Identity & Medical Records Vault",
    template: "%s | MediVault Chain AI",
  },
  description:
    "Secure, patient-owned digital health vault. Store medical records, scan prescriptions with AI OCR, generate emergency medical QR passes, and ensure data integrity with blockchain verification.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MediVault",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "digital health vault",
    "electronic health records",
    "AI medical record scanner",
    "handwritten prescription OCR",
    "emergency medical QR pass",
    "break glass medical access",
    "blockchain health records",
    "patient data sovereignty",
    "HIPAA compliant health locker",
    "clinical decision support",
    "personal health record app",
    "decentralized health records",
    "AI doctor copilot",
    "medical document management",
    "vital signs tracking",
    "patient consent management",
    "medical timeline visualizer",
    "Polygon blockchain medical verification",
    "digital health locker India",
    "emergency paramedic QR code",
  ],
  authors: [{ name: "MediVault Health", url: APP_URL }],
  creator: "MediVault",
  publisher: "MediVault Health Tech",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: "MediVault Chain AI — Digital Health Identity & Medical Records Vault",
    description:
      "Patient-owned electronic medical records, AI prescription scanner, and emergency medical QR pass secured with cryptographic blockchain proofs.",
    url: APP_URL,
    siteName: "MediVault Chain AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediVault Chain AI — Digital Health Identity Platform",
    description:
      "Patient-owned medical records with AI prescription scanning and emergency break-glass QR access.",
    creator: "@medivault",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// ─── Schema.org Structured Data (JSON-LD) ───────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${APP_URL}/#software`,
      "name": "MediVault Chain AI",
      "operatingSystem": "Web, iOS, Android (PWA)",
      "applicationCategory": "HealthApplication",
      "description":
        "AI-powered, blockchain-enabled Digital Health Identity Platform for secure medical records management and emergency medical passes.",
      "url": APP_URL,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "142",
      },
    },
    {
      "@type": "MedicalOrganization",
      "@id": `${APP_URL}/#organization`,
      "name": "MediVault",
      "url": APP_URL,
      "logo": `${APP_URL}/icons/icon-512.png`,
      "description":
        "Decentralized patient-owned health records, clinical AI OCR, and emergency trauma access systems.",
      "sameAs": [
        "https://github.com/aniketvishwakarma-11/MediVault",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${APP_URL}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does MediVault protect my sensitive medical data?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "MediVault uses end-to-end client-side encryption (AES-GCM-256). Your medical files are encrypted before leaving your browser and stored across private S3 vaults. Only you and explicitly authorized doctors hold access — MediVault never exposes unauthenticated data.",
          },
        },
        {
          "@type": "Question",
          "name": "How does the Emergency Medical Pass work during trauma situations?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Patients can generate an Emergency Pass QR code. In an emergency, verified paramedics scan the pass to perform a statutory 'Break-Glass' override, revealing critical allergies, blood type, and emergency contacts in a time-limited, fully audited session.",
          },
        },
        {
          "@type": "Question",
          "name": "How does the AI Clinical Copilot extract and verify data?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "When you upload medical reports or prescriptions, Google Gemini and specialized OCR models perform clinical entity resolution. Every extracted metric is verified and linked directly to the original source document.",
          },
        },
        {
          "@type": "Question",
          "name": "Can doctors access my records without my explicit permission?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "No. Doctors must submit an access request with clinical justification and duration. You receive an instant notification to approve or deny.",
          },
        },
        {
          "@type": "Question",
          "name": "Is MediVault free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Yes — creating a patient vault, uploading records, and generating an emergency QR pass are completely free.",
          },
        },
        {
          "@type": "Question",
          "name": "What happens if I lose access to my account?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Your records are tied to your verified credentials and recovery protocols, ensuring you can regain access securely at any time.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full font-sans" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <PWAProvider>
              <MaintenanceGuard>
                <MotionConfig reducedMotion="user">
                  {children}
                  <MobileBottomNav />
                  <PWAInstallBanner />
                </MotionConfig>
              </MaintenanceGuard>
            </PWAProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
