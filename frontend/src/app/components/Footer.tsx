"use client";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Patient Portal", href: "#" },
      { label: "Doctor Dashboard", href: "#" },
      { label: "Hospital Admin", href: "#" },
      { label: "AI Copilot", href: "#" },
      { label: "Emergency QR", href: "#" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "AI Engine", href: "#ai-pipeline" },
      { label: "Blockchain", href: "#blockchain" },
      { label: "Security", href: "#security" },
      { label: "API Reference", href: "#" },
      { label: "Integrations", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Developer Guide", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Status Page", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Partners", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--mv-bg-secondary)",
        borderTop: "1px solid var(--mv-border)",
        padding: "80px 24px 32px",
      }}
    >
      <div className="container-max">
        {/* Top Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr repeat(4, 1fr)",
            gap: 48,
            marginBottom: 64,
          }}
          className="footer-grid"
        >
          {/* Brand Column */}
          <div>
            <a
              href="#"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "var(--mv-text-primary)",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #0e7490, #0f766e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12h6" />
                  <path d="M12 9v6" />
                  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                </svg>
              </div>
              <span
                style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                Medi<span style={{ color: "var(--mv-accent-cyan)" }}>Vault</span>
              </span>
            </a>
            <p
              style={{
                color: "var(--mv-text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                maxWidth: 280,
                marginBottom: 24,
              }}
            >
              AI-powered, blockchain-enabled Digital Health Identity Platform.
              Your health data, owned by you.
            </p>
            {/* Social Icons */}
            <div style={{ display: "flex", gap: 12 }}>
              {[
                // Twitter/X
                <svg key="x" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16zM4 20l6.768-6.768M20 4l-6.768 6.768" /></svg>,
                // GitHub
                <svg key="gh" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>,
                // LinkedIn
                <svg key="li" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>,
                // Discord
                <svg key="dc" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>,
              ].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid var(--mv-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--mv-text-muted)",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--mv-accent-cyan)";
                    e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)";
                    e.currentTarget.style.background = "rgba(34,211,238,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--mv-text-muted)";
                    e.currentTarget.style.borderColor = "var(--mv-border)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--mv-text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 20,
                }}
              >
                {section.title}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {section.links.map((link) => (
                  <a key={link.label} href={link.href} className="footer-link">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "var(--mv-border)",
            marginBottom: 32,
          }}
        />

        {/* Bottom Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <p
            style={{
              color: "var(--mv-text-muted)",
              fontSize: "0.8rem",
            }}
          >
            &copy; {new Date().getFullYear()} MediVault Chain AI. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="footer-link"
                  style={{ fontSize: "0.8rem" }}
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>
      </div>

      {/* Responsive Footer Grid */}
      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
