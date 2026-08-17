"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, LayoutDashboard, LogOut, ArrowRight } from "lucide-react";



export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { userProfile, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* 2px brand accent topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#0891B2]" />

      <header
        className={`fixed top-0.5 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-white/96 backdrop-blur-md shadow-sm border-b border-slate-200 py-3"
            : "bg-white border-b border-slate-200/60 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
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


          {/* Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            {userProfile ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href={userProfile.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0891B2] text-sm font-semibold hover:bg-cyan-100 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {userProfile.role === "doctor" ? "Doctor Portal" : "Patient Portal"}
                </Link>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
        </div>

        {/* Mobile Dropdown — auth only */}
        {userProfile === null && (
          <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 flex flex-col gap-2.5 animate-in slide-in-from-top duration-150">
            <Link
              href="/auth"
              className="w-full text-center py-3 rounded-lg border border-slate-200 text-slate-800 font-medium text-sm min-h-[44px] flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="w-full text-center py-3 rounded-lg bg-[#0891B2] text-white font-semibold text-sm min-h-[44px] flex items-center justify-center hover:bg-[#0e7490] transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
