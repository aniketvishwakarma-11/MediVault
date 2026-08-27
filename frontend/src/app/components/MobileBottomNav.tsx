"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Pill,
  Sparkles,
  User,
  Users,
  Cpu,
  BarChart3,
  Settings,
  Plus,
  Stethoscope,
  ShieldCheck,
  Activity
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { userProfile, isDemo } = useAuth();

  // Don't render on landing page or auth page if not logged in
  if (pathname === "/" || pathname === "/auth" || pathname.startsWith("/e/") || pathname.startsWith("/verify/")) {
    return null;
  }

  const isPatient = pathname.startsWith("/patient");
  const isDoctor = pathname.startsWith("/doctor");
  const isAdmin = pathname.startsWith("/admin");

  // Determine Nav Items based on active portal or user role
  let navItems: { label: string; href: string; icon: any; isCenterAction?: boolean }[] = [];

  if (isPatient) {
    navItems = [
      { label: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/patient/reports", icon: FileText },
      { label: "Upload", href: "/patient/reports", icon: Plus, isCenterAction: true },
      { label: "Meds", href: "/patient/prescriptions", icon: Pill },
      { label: "AI Copilot", href: "/patient/ai-copilot", icon: Sparkles },
    ];
  } else if (isDoctor) {
    navItems = [
      { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/doctor/patients", icon: Users },
      { label: "Prescribe", href: "/doctor/prescriptions", icon: Plus, isCenterAction: true },
      { label: "Copilot", href: "/doctor/copilot", icon: Sparkles },
      { label: "Profile", href: "/doctor/profile", icon: User },
    ];
  } else if (isAdmin) {
    navItems = [
      { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "AI Hub", href: "/admin/ai", icon: Cpu, isCenterAction: true },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "System", href: "/admin/system", icon: Settings },
    ];
  } else {
    // Fallback for other routes
    navItems = [
      { label: "Portal", href: "/patient/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/patient/reports", icon: FileText },
      { label: "AI Copilot", href: "/patient/ai-copilot", icon: Sparkles },
    ];
  }

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/patient/dashboard" && item.href !== "/doctor/dashboard" && item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

          if (item.isCenterAction) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group relative -top-3 flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-full"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0891B2] to-[#06B6D4] text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 border-2 border-white transition-transform duration-150 active:scale-95">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] active:scale-95 ${
                isActive
                  ? "text-[#0891B2] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? "bg-cyan-50 text-[#0891B2]" : "text-slate-500"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "text-[#0891B2] font-bold" : "text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
