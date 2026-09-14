import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service & Clinical Usage Policy",
  description:
    "Read the terms of service, clinical decision support terms, user responsibilities, and emergency pass usage policies for MediVault Chain AI.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service & Clinical Usage Policy | MediVault Chain AI",
    description:
      "Read the terms of service and clinical usage policies for MediVault Chain AI.",
    url: "/terms",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
