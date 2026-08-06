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
  Activity,
  Bell,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PatientLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
  { name: "Medical Records", href: "/patient/reports", icon: FileText },
  { name: "Timeline", href: "/patient/timeline", icon: Clock },
  { name: "AI Copilot", href: "/patient/ai-copilot", icon: Bot },
  { name: "Emergency ID", href: "/patient/emergency", icon: ShieldAlert },
  { name: "Consent & Access", href: "/patient/consent", icon: Key },
  { name: "Profile", href: "/patient/profile", icon: User },
];

export default function PatientLayout({ children }: PatientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isProfileCompleted, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Route Guard: If profile is not completed, redirect to /patient/profile
  React.useEffect(() => {
    if (isProfileCompleted === false && pathname !== "/patient/profile") {
      router.push("/patient/profile?required=true");
    }
  }, [isProfileCompleted, pathname, router]);

  const displayName = userProfile?.displayName || user?.email?.split("@")[0] || "Patient Identity";
  const displayEmail = userProfile?.email || user?.email || "patient@medivault.local";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative font-sans flex flex-col">
      {/* Background Ambient Orbs */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl pointer-events-none -z-10" />

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <Link href="/patient/dashboard" className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">MediVault</span>
        </Link>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
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
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg text-slate-900 leading-none tracking-tight">
                  MediVault <span className="text-sky-600">AI</span>
                </h1>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">
                  Patient Health Portal
                </p>
              </div>
            </Link>
          </div>

          {/* User Account Quick Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {initial}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-slate-900 truncate">{displayName}</h4>
              <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Patient</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
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
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Info & System Health */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Vault Nodes</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Storage</span>
              <span className="text-sky-700 font-mono font-semibold">MinIO S3</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper with Top Bar */}
      <div className="md:pl-72 min-h-screen flex flex-col w-full relative z-10">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white/80 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search records, diagnoses, doctors..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-sky-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <Link href="/patient/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-200">
                {initial}
              </div>
              <span className="text-xs font-bold text-slate-800">{displayName}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
