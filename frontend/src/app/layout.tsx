import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

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
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
