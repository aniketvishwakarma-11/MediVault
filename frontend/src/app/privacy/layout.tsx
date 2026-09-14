import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & DPDPA 2023 Compliance",
  description:
    "Learn how MediVault protects your personal and clinical health data under the Digital Personal Data Protection Act (DPDPA 2023), HIPAA, and zero-knowledge encryption.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy & DPDPA 2023 Compliance | MediVault Chain AI",
    description:
      "Learn how MediVault protects your personal and clinical health data under DPDPA 2023 and HIPAA standards.",
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
