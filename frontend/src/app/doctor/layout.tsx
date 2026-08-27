"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Stethoscope,
  LayoutDashboard,
  Users,
  ShieldAlert,
  Pill,
  Bot,
  UserCheck,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Search,
  Lock,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DoctorLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Patients & Access", href: "/doctor/patients", icon: Users },
  { name: "Emergency Terminal", href: "/doctor/emergency", icon: ShieldAlert, badge: "LIVE" },
  { name: "Prescriptions", href: "/doctor/prescriptions", icon: Pill },
  { name: "AI Medical Copilot", href: "/doctor/copilot", icon: Bot, highlight: true },
  { name: "Profile & Security", href: "/doctor/profile", icon: UserCheck },
];

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isDemo, isProfileCompleted, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Doctor Route Guard: For REAL doctors, if profile is not completed, redirect to /doctor/profile
  React.useEffect(() => {
    if (!isDemo && user?.id) {
      const isLocallyDone = localStorage.getItem(`medivault_doctor_completed_${user.id}`) === "true";
      if (isLocallyDone) {
        return;
      }
    }
    if (!isDemo && isProfileCompleted === false && pathname !== "/doctor/profile") {
      router.replace("/doctor/profile?required=true");
    }
  }, [isProfileCompleted, isDemo, pathname, router, user]);

  const doctorName =
    userProfile?.displayName || (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Physician");

  const doctorInitials =
    doctorName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "MD";

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-[#0F172A] relative font-body flex flex-col">
      {/* Background Ambient Mesh */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/40 blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl pointer-events-none -z-10" />

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <Link href="/doctor/dashboard" className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0891B2] text-white shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-base text-[#0F172A] tracking-tight">MediVault</span>
            <span className="ml-1.5 text-[10px] text-[#0891B2] font-bold px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 uppercase">DOCTOR</span>
          </div>
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
        className={`fixed top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200/90 shadow-sm flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Header Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-xl">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-lg text-[#0F172A] leading-none tracking-tight flex items-center gap-1.5">
                  MediVault <span className="text-[#0891B2]">EMR</span>
                </h1>
                <p className="text-[10px] text-[#475569] mt-1 font-bold uppercase tracking-wider">
                  Clinical Intelligence Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Doctor Account Quick Card */}
          <Link
            href="/doctor/profile"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-200/80 hover:border-cyan-200 transition-all flex items-center gap-3 group cursor-pointer block"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-heading group-hover:scale-105 transition-transform">
              {doctorInitials}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-heading text-xs font-bold text-[#0F172A] group-hover:text-[#0891B2] transition-colors truncate">{doctorName}</h4>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#065F46] font-semibold">
                <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
                <span>Verified Physician</span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 font-heading">
              Clinical Portal
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/doctor/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                    isActive
                      ? "bg-cyan-50 text-[#0891B2] border border-cyan-200/80 shadow-xs font-bold font-heading"
                      : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#0891B2]" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-[#0891B2]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <Link
            href="/doctor/emergency"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[44px]"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>EMERGENCY ACCESS SCAN</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#0891B2] hover:bg-cyan-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out Portal
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper with Top Bar */}
      <div className="md:pl-72 min-h-screen flex flex-col w-full relative z-10">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 w-96">
            <Link
              href="/doctor/patients"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#0F172A] hover:bg-white hover:border-[#0891B2] text-xs transition-all min-h-[38px]"
            >
              <Search className="w-4 h-4 text-[#0891B2]" />
              <span>Search Patients by ID, Name, Blood...</span>
              <kbd className="ml-auto hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </Link>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Quick Emergency Scanner Button */}
            <Link
              href="/doctor/emergency"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 text-[#0891B2] border border-cyan-200 text-xs font-bold transition-all min-h-[38px]"
            >
              <ShieldAlert className="w-4 h-4 text-[#0891B2]" />
              <span>Emergency Scanner</span>
            </Link>

            {/* AI Assistant Quick Launcher */}
            <Link
              href="/doctor/copilot"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[38px]"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Copilot</span>
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* EMR Footer Banner */}
        <footer className="border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white/60 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#0891B2]" />
            <span className="font-medium text-[#475569]">MediVault Clinical EMR Node — End-to-End Encrypted & Blockchain Verified</span>
          </div>
          <div className="font-semibold text-slate-400">HIPAA & GDPR Compliant Portal</div>
        </footer>
      </div>
    </div>
  );
}

