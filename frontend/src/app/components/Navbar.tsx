"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, LayoutDashboard, LogOut, ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "AI Engine", href: "/#ai-pipeline" },
  { label: "Blockchain Security", href: "/#security" },
  { label: "Doctor Portal", href: "/doctor/dashboard" },
  { label: "Emergency Pass", href: "/patient/emergency" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userProfile, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200/90 py-3"
            : "bg-transparent py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 rounded-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900">
                Medi<span className="text-[#0891B2]">Vault</span>
              </span>
              <span className="ml-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200">
                AI & ZKP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-[#0891B2] transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-md min-h-[44px] flex items-center"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* User Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {userProfile ? (
              <div className="flex items-center gap-3">
                <Link
                  href={userProfile.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] text-sm font-semibold hover:bg-cyan-100 transition-all shadow-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {userProfile.role === "doctor" ? "Doctor Portal" : "Patient Portal"}
                </Link>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-all min-h-[44px] flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-white text-sm font-semibold shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-base font-medium text-slate-700 hover:text-[#0891B2] py-2 min-h-[44px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              {userProfile ? (
                <Link
                  href="/patient/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0891B2] text-white font-semibold min-h-[44px]"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl border border-slate-200 text-slate-800 font-semibold min-h-[44px] flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-[#22C55E] text-white font-semibold min-h-[44px] flex items-center justify-center"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

