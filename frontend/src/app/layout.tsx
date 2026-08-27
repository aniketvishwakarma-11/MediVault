import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { MaintenanceGuard } from "@/app/components/MaintenanceGuard";
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
            <MaintenanceGuard>
              <MotionConfig reducedMotion="user">
                {children}
                <MobileBottomNav />
              </MotionConfig>
            </MaintenanceGuard>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
