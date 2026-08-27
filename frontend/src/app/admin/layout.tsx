"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  ScrollText,
  Activity,
  Pill,
  Bot,
  BellRing,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Search,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Analytics & BI", href: "/admin/analytics", icon: Activity },
  { name: "Document Registry", href: "/admin/documents", icon: FileText },
  { name: "Consent Registry", href: "/admin/consents", icon: ShieldCheck },
  { name: "Audit Trail", href: "/admin/audit-logs", icon: ScrollText },
  { name: "System Health", href: "/admin/system", icon: Activity, badge: "LIVE" },
  { name: "Prescriptions", href: "/admin/prescriptions", icon: Pill },
  { name: "AI Monitor", href: "/admin/ai", icon: Bot, highlight: true },
  { name: "Notifications", href: "/admin/notifications", icon: BellRing },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, role, loading, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ─── Strict Admin Authentication & Role-Based Access Guard ───
  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth?redirect=" + encodeURIComponent(pathname || "/admin/dashboard"));
        return;
      }

      const activeRole =
        userProfile?.role ||
        role ||
        (typeof window !== "undefined" ? localStorage.getItem("medivault_user_role") : null);

      const isAdmin =
        activeRole === "admin" ||
        user.email === "admin@medivault.health" ||
        user.user_metadata?.role === "admin";

      if (!isAdmin) {
        router.replace("/auth?unauthorized=true");
      }
    }
  }, [user, userProfile, role, loading, pathname, router]);

  // Loading state guard to prevent unauthenticated content flash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0891B2] text-white flex items-center justify-center animate-pulse shadow-lg shadow-cyan-500/20">
          <Shield className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-500 font-mono">Verifying administrative security credentials...</p>
      </div>
    );
  }

  // If user is not authorized admin, do not render console
  const activeRole =
    userProfile?.role ||
    role ||
    (typeof window !== "undefined" ? localStorage.getItem("medivault_user_role") : null);

  const isAuthorizedAdmin =
    user &&
    (activeRole === "admin" ||
      user.email === "admin@medivault.health" ||
      user.user_metadata?.role === "admin");

  if (!isAuthorizedAdmin) {
    return null;
  }

  const adminName =
    userProfile?.displayName || (user?.email ? user.email.split("@")[0] : "Administrator");

  const adminInitials =
    adminName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "AD";

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-[#0F172A] relative font-body flex flex-col">
      {/* Background Ambient Mesh */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/40 blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl pointer-events-none -z-10" />

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0891B2] text-white shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-base text-[#0F172A] tracking-tight">MediVault</span>
            <span className="ml-1.5 text-[10px] text-[#0891B2] font-bold px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 uppercase">ADMIN</span>
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
        className={`fixed top-0 left-0 z-50 md:z-40 h-full max-h-screen w-72 bg-white border-r border-slate-200/90 shadow-sm flex flex-col justify-between p-5 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-5 flex-1 flex flex-col min-h-0">
          {/* Header Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-xl">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-lg text-[#0F172A] leading-none tracking-tight flex items-center gap-1.5">
                  MediVault <span className="text-[#0891B2]">Admin</span>
                </h1>
                <p className="text-[10px] text-[#475569] mt-1 font-bold uppercase tracking-wider">
                  System Administration
                </p>
              </div>
            </Link>
          </div>

          {/* Admin Account Quick Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-heading">
              {adminInitials}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <h4 className="font-heading text-xs font-bold text-[#0F172A] truncate">{adminName}</h4>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#0891B2] font-semibold">
                <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
                <span>Super Administrator</span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Scrollable if needed) */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 font-heading">
              Admin Console
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
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
        <div className="pt-4 border-t border-slate-100 shrink-0 pb-6 md:pb-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out Console
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
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
      <div className="md:pl-72 min-h-screen flex flex-col w-full relative z-10">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 w-96">
            <Link
              href="/admin/users"
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#0F172A] hover:bg-white hover:border-[#0891B2] text-xs transition-all min-h-[38px]"
            >
              <Search className="w-4 h-4 text-[#0891B2]" />
              <span>Search platform users, doctors, logs...</span>
              <kbd className="ml-auto hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </Link>
          </div>

          <div className="flex items-center gap-3 relative">
            <Link
              href="/admin/system"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 text-[#0891B2] border border-cyan-200 text-xs font-bold transition-all min-h-[38px]"
            >
              <Activity className="w-4 h-4 text-[#0891B2]" />
              <span>System Live Monitor</span>
            </Link>

            <Link
              href="/admin/ai"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[38px]"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Telemetry</span>
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer Banner */}
        <footer className="border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white/60 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#0891B2]" />
            <span className="font-medium text-[#475569]">MediVault Platform Administration — End-to-End Encrypted & Blockchain Verified</span>
          </div>
          <div className="font-semibold text-slate-400">HIPAA & GDPR Compliant Portal</div>
        </footer>
      </div>
    </div>
  );
}
