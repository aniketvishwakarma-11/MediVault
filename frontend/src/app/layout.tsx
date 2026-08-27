import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { MaintenanceGuard } from "@/app/components/MaintenanceGuard";
import { PWAProvider } from "@/app/components/PWAProvider";
import PWAInstallBanner from "@/app/components/PWAInstallBanner";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { MotionConfig } from "motion/react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0891B2",
};

export const metadata: Metadata = {
  title: "MediVault Chain AI — Your Digital Health Identity Platform",
  description:
    "AI-powered, blockchain-enabled Digital Health Identity Platform. Own your medical records, get AI-driven insights, and ensure data integrity with blockchain verification.",
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
    "medical records",
    "health platform",
    "AI healthcare",
    "blockchain health",
    "digital health identity",
    "patient data",
    "health copilot",
  ],
  openGraph: {
    title: "MediVault Chain AI",
    description:
      "Your Health. Your Data. Your Control. The intelligent healthcare platform.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full font-sans" data-scroll-behavior="smooth" suppressHydrationWarning>
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
