import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Notarized Prescription & Records",
  description:
    "Instant cryptographic verification of digital prescriptions, doctor electronic signatures, and Polygon blockchain notarization records.",
  alternates: {
    canonical: "/verify",
  },
  openGraph: {
    title: "Verify Notarized Prescription & Records | MediVault Chain AI",
    description:
      "Instant cryptographic verification of digital prescriptions, doctor electronic signatures, and Polygon blockchain notarization records.",
    url: "/verify",
    type: "website",
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
