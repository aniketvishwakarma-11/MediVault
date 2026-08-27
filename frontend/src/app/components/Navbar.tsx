"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  ArrowRight,
  Menu,
  X,
  User,
  Stethoscope,
  Shield,
  FileCheck,
  AlertCircle
} from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userProfile, isDemo, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const portalHref =
    userProfile?.role === "doctor"
      ? "/doctor/dashboard"
      : userProfile?.role === "admin"
      ? "/admin/dashboard"
      : "/patient/dashboard";

  const portalLabel =
    userProfile?.role === "doctor"
      ? "Doctor Portal"
      : userProfile?.role === "admin"
      ? "Admin Console"
      : "Patient Portal";

  return (
    <>
      {/* 2px brand accent topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#0891B2]" />

      <header
        className={`fixed top-0.5 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled || mobileMenuOpen
            ? "bg-white/98 backdrop-blur-md shadow-sm border-b border-slate-200 py-3"
            : "bg-white border-b border-slate-200/60 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0891B2] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-[1.1rem] tracking-tight text-slate-900">
                Medi<span className="text-[#0891B2]">Vault</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-50 text-[#0891B2] border border-cyan-200">
                AI · ZKP
              </span>
            </div>
          </Link>

          {/* Desktop Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {userProfile ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href={portalHref}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0891B2] text-sm font-semibold hover:bg-cyan-100 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {portalLabel}
                </Link>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
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
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[44px] flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#0891B2] hover:bg-[#0e7490] text-white text-sm font-semibold transition-colors min-h-[44px] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 flex flex-col gap-3 animate-in slide-in-from-top duration-200 shadow-xl">
            {userProfile ? (
              <div className="space-y-3">
                {/* User Profile Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 border border-cyan-200 text-[#0891B2] flex items-center justify-center font-bold font-heading">
                      {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {userProfile.displayName || "User"}
                      </p>
                      <p className="text-xs text-slate-500">{userProfile.email || "MediVault Account"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-100 text-[#0891B2] border border-cyan-200">
                    {userProfile.role}
                  </span>
                </div>

                {/* Main Portal Action */}
                <Link
                  href={portalHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[#0891B2] text-white font-bold text-sm min-h-[44px] flex items-center justify-center gap-2 shadow-sm hover:bg-[#0e7490] transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to {portalLabel}</span>
                </Link>

                {/* Quick Navigation Links */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/patient/emergency"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Emergency QR</span>
                  </Link>
                  <Link
                    href="/verify"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 flex items-center gap-2 hover:bg-slate-50"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verify Rx</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 font-semibold text-xs min-h-[44px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl border border-slate-200 text-slate-800 font-semibold text-sm min-h-[44px] flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-[#0891B2] text-white font-bold text-sm min-h-[44px] flex items-center justify-center gap-2 shadow-sm hover:bg-[#0e7490] transition-colors"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
