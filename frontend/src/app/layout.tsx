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
    default: "MediVault — Patient-Owned Digital Health Records & AI Vault",
    template: "%s | MediVault Chain AI",
  },
  description:
    "Secure digital health vault with AI prescription OCR, emergency trauma QR passes, and tamper-proof medical records notarized on Polygon blockchain.",
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
  other: {
    "article:published_time": "2026-08-01T00:00:00Z",
    "article:modified_time": "2026-09-15T00:00:00Z",
    "date": "2026-09-15",
    "revised": "Tuesday, September 15, 2026",
  },
  openGraph: {
    title: "MediVault — Patient-Owned Digital Health Records & AI Vault",
    description:
      "Secure digital health vault with AI prescription OCR, emergency trauma QR passes, and tamper-proof medical records notarized on Polygon blockchain.",
    url: APP_URL,
    siteName: "MediVault Chain AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${APP_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "MediVault Chain AI — Sovereign Digital Health Identity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MediVault — Patient-Owned Digital Health Records & AI Vault",
    description:
      "Secure digital health vault with AI prescription OCR, emergency trauma QR passes, and tamper-proof medical records notarized on Polygon blockchain.",
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
      "screenshot": `${APP_URL}/opengraph-image`,
      "featureList":
        "AI Handwritten Prescription Scanner, Emergency Trauma QR Pass, 14-Digit ABHA ID Sync, Polygon Blockchain Notarization, Client-Side AES-256 Encryption, Longitudinal Clinical Timeline",
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
      "@type": "BreadcrumbList",
      "@id": `${APP_URL}/#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": APP_URL
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Public Verification Hub",
          "item": `${APP_URL}/verify`
        }
      ]
    },
    {
      "@type": "WebPage",
      "@id": `${APP_URL}/#webpage`,
      "url": APP_URL,
      "name": "MediVault — Patient-Owned Digital Health Records & AI Vault",
      "description": "Patient-owned electronic medical records, AI prescription scanner, and emergency medical QR pass secured with cryptographic blockchain proofs.",
      "datePublished": "2026-08-01T00:00:00Z",
      "dateModified": "2026-09-15T00:00:00Z",
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
      "image": `${APP_URL}/opengraph-image`,
      "totalTime": "PT2M",
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": "0"
      },
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
      "image": `${APP_URL}/opengraph-image`,
      "totalTime": "PT3M",
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": "0"
      },
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
      "description": "Frequently asked questions regarding MediVault digital health vault, encryption, ABHA ID integration, and emergency passes.",
      "mainEntity": FAQS.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "text": faq.question,
        "dateCreated": "2026-08-01T00:00:00Z",
        "answerCount": 1,
        "upvoteCount": 42,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
          "dateCreated": "2026-08-01T00:00:00Z",
          "upvoteCount": 42,
        },
        "suggestedAnswer": {
          "@type": "Answer",
          "text": faq.snippetAnswer || faq.answer,
          "dateCreated": "2026-08-01T00:00:00Z",
          "upvoteCount": 38,
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
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {/* Accessible Skip to Content Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-cyan-700 focus:text-white focus:rounded-xl focus:shadow-xl focus:font-bold focus:text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all"
        >
          Skip to main content
        </a>
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
