"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  User, 
  LayoutDashboard, 
  FileText, 
  Clock, 
  Bot, 
  ShieldAlert, 
  Key, 
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Search,
  CheckCircle2,
  Pill
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PatientLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
  { name: "Medical Records", href: "/patient/reports", icon: FileText },
  { name: "Prescriptions", href: "/patient/prescriptions", icon: Pill },
  { name: "Timeline", href: "/patient/timeline", icon: Clock },
  { name: "AI Copilot", href: "/patient/ai-copilot", icon: Bot },
  { name: "Emergency ID", href: "/patient/emergency", icon: ShieldAlert },
  { name: "Consent & Access", href: "/patient/consent", icon: Key },
  { name: "Profile", href: "/patient/profile", icon: User },
];

export default function PatientLayout({ children }: PatientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isDemo, isProfileCompleted, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Route Guard: For REAL users, if profile is not completed, redirect to /patient/profile
  // For DEMO users, NEVER force redirect to profile page.
  React.useEffect(() => {
    if (user && !isDemo && isProfileCompleted === false && pathname !== "/patient/profile") {
      router.replace("/patient/profile?required=true");
    }
  }, [user, isProfileCompleted, isDemo, pathname, router]);

  const displayName = userProfile?.displayName || user?.email?.split("@")[0] || "Patient Identity";
  const displayEmail = userProfile?.email || user?.email || "patient@medivault.local";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-body flex flex-col">

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <Link href="/patient/dashboard" className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#0891B2] text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-heading font-extrabold text-lg text-[#0F172A] tracking-tight">MediVault</span>
        </Link>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
          aria-label="Toggle navigation"
        >
          {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* FIXED Light Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 z-50 md:z-40 h-full max-h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-5 px-4 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-xl">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-lg text-[#0F172A] leading-none tracking-tight">
                  MediVault <span className="text-[#0891B2]">AI</span>
                </h1>
                <p className="text-[10px] text-[#475569] mt-1 font-bold uppercase tracking-wider">
                  Patient Health Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 font-heading">
              Patient Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                    isActive
                      ? "bg-cyan-50 text-[#0891B2] font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#0891B2] rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0891B2]" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info & System Health */}
        <div className="pt-4 border-t border-slate-100 space-y-3 shrink-0 pb-6 md:pb-0">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-[#475569] space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Vault Nodes</span>
              <span className="text-[#065F46] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Storage</span>
              <span className="text-[#0891B2] font-mono font-semibold">MinIO S3</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors shadow-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-45 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Content Wrapper with Top Bar */}
      <div className="md:pl-64 min-h-screen flex flex-col w-full">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search records, diagnoses, doctors..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition-all min-h-[38px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <Link href="/patient/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-lg p-1">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-[#0891B2] font-bold text-xs flex items-center justify-center border border-cyan-200 font-heading">
                {initial}
              </div>
              <span className="font-heading text-xs font-bold text-[#0F172A]">{displayName}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
