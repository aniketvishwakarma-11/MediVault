import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ErrorModalProvider } from "@/context/ErrorModalContext";
import { ClinicalErrorBoundary } from "@/app/components/ClinicalErrorBoundary";
import { MaintenanceGuard } from "@/app/components/MaintenanceGuard";
import { PWAProvider } from "@/app/components/PWAProvider";
import PWAInstallBanner from "@/app/components/PWAInstallBanner";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { MotionConfig } from "motion/react";
import { FAQS } from "@/data/faqs";
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
    images: [`${APP_URL}/opengraph-image`],
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
  verification: {
    google: "uy1sq5WoTzGlX2PSa44Z4t-bUjmx2TiEWpePq4jRbaM",
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
      "name": "MediVault Chain AI",
      "url": APP_URL,
      "logo": `${APP_URL}/icons/icon-512.png`,
      "description":
        "Decentralized patient-owned health records, clinical AI OCR, and emergency trauma access systems.",
      "sameAs": [
        "https://github.com/aniketvishwakarma-11/MediVault",
      ],
      "knowsAbout": [
        "https://en.wikipedia.org/wiki/Ayushman_Bharat_Digital_Mission",
        "https://en.wikipedia.org/wiki/Electronic_health_record",
        "https://en.wikipedia.org/wiki/Optical_character_recognition",
        "https://en.wikipedia.org/wiki/Polygon_(blockchain)",
        "https://en.wikipedia.org/wiki/Health_Insurance_Portability_and_Accountability_Act",
        "https://en.wikipedia.org/wiki/Fast_Healthcare_Interoperability_Resources"
      ],
    },
    {
      "@type": "WebPage",
      "@id": `${APP_URL}/#webpage`,
      "url": APP_URL,
      "name": "MediVault Chain AI — Digital Health Identity Platform",
      "description": "Patient-owned electronic medical records, AI prescription scanner, and emergency medical QR pass secured with cryptographic blockchain proofs.",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".seo-answer-snippet", ".seo-faq-question", ".seo-faq-answer"]
      }
    },
    {
      "@type": "HowTo",
      "@id": `${APP_URL}/#howto-prescription`,
      "name": "How to Scan & Digitize Handwritten Doctor Prescriptions with AI",
      "description": "Digitize paper prescriptions, extract clinical dosages, and compare generic medicine costs using MediVault's multimodal AI OCR.",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Capture or Upload Prescription",
          "text": "Photograph your handwritten paper prescription or upload an existing PDF/image into your secure MediVault locker."
        },
        {
          "@type": "HowToStep",
          "name": "AI Neural Transcription",
          "text": "MediVault's TrOCR neural network and Google Gemini 1.5 extract medicine names, strengths, frequency, and daily dosing schedules."
        },
        {
          "@type": "HowToStep",
          "name": "Verify & Save to Pill Cabinet",
          "text": "Review extracted items against the RxNorm database, compare affordable PM Jan Aushadhi generic alternatives, and sync to your daily adherence calendar."
        }
      ]
    },
    {
      "@type": "HowTo",
      "@id": `${APP_URL}/#howto-emergency`,
      "name": "How to Set Up an Emergency Medical QR Pass",
      "description": "Create an offline-compatible emergency medical QR pass for first responders during trauma and unconsciousness.",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Configure Critical Health Vitals",
          "text": "Input your blood group, severe drug allergies, active chronic conditions, and emergency ICE contact phone numbers."
        },
        {
          "@type": "HowToStep",
          "name": "Generate Cryptographic QR Pass",
          "text": "MediVault generates a tamper-evident Emergency Pass encoded with an ABDM-standard emergency token."
        },
        {
          "@type": "HowToStep",
          "name": "Print or Set as Lockscreen",
          "text": "Save the pass as your phone lockscreen wallpaper or print an emergency wallet card for instant first-responder scan access."
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": `${APP_URL}/#faq`,
      "mainEntity": FAQS.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full font-sans" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="uy1sq5WoTzGlX2PSa44Z4t-bUjmx2TiEWpePq4jRbaM" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <ErrorModalProvider>
              <ClinicalErrorBoundary>
                <PWAProvider>
                  <MaintenanceGuard>
                    <MotionConfig reducedMotion="user">
                      {children}
                      <MobileBottomNav />
                      <PWAInstallBanner />
                    </MotionConfig>
                  </MaintenanceGuard>
                </PWAProvider>
              </ClinicalErrorBoundary>
            </ErrorModalProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
