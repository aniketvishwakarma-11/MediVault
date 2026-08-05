"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "AI Engine", href: "/#ai-pipeline" },
  { label: "Blockchain", href: "/#blockchain" },
  { label: "Security", href: "/#security" },
  { label: "How It Works", href: "/#how-it-works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`nav-blur ${scrolled ? "scrolled" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--mv-text-primary)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, #0e7490, #0f766e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(14, 116, 144, 0.3)",
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
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Medi<span style={{ color: "var(--mv-accent-cyan)" }}>Vault</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
            className="desktop-nav"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  color: "var(--mv-text-secondary)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "color 0.2s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--mv-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--mv-text-secondary)")
                }
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Auth State */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 12 }}
            className="desktop-nav"
          >
            {userProfile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: 99,
                    background: "rgba(34, 211, 238, 0.1)",
                    border: "1px solid rgba(34, 211, 238, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.825rem",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mv-accent-cyan)" }} />
                  <span style={{ fontWeight: 600, color: "var(--mv-text-primary)" }}>{userProfile.displayName}</span>
                  <span style={{ color: "var(--mv-text-muted)", textTransform: "capitalize", fontSize: "0.75rem" }}>({userProfile.role})</span>
                </div>
                <button
                  onClick={logout}
                  className="btn-ghost"
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <a href="/auth" className="btn-ghost" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                  Sign In
                </a>
                <a href="/auth" className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                  Get Started
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </a>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              background: "none",
              border: "none",
              color: "var(--mv-text-primary)",
              cursor: "pointer",
              padding: 8,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M4 8h16" />
                  <path d="M4 16h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${mobileOpen ? "open" : ""}`}>
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            background: "none",
            border: "none",
            color: "var(--mv-text-primary)",
            cursor: "pointer",
          }}
          aria-label="Close menu"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="mobile-menu-content">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <a href="#" className="btn-ghost" onClick={() => setMobileOpen(false)}>
              Sign In
            </a>
            <a href="#" className="btn-primary" onClick={() => setMobileOpen(false)}>
              Get Started
            </a>
          </div>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-nav-toggle { display: none !important; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}
