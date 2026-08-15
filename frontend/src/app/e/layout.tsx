import type { ReactNode } from 'react';

// Minimal layout for the public emergency gateway — no auth, no sidebar.
// This is a segment layout (not root), so no html/body — those come from the root app/layout.tsx.
export default function EmergencyGatewayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {children}
    </div>
  );
}

