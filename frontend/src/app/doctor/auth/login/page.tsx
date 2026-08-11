"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stethoscope, Lock, Mail, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DoctorLoginPage() {
  const router = useRouter();
  const { setDemoUser } = useAuth();
  const [email, setEmail] = useState("dr.jenkins@medivault.org");
  const [password, setPassword] = useState("doctorPass123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Set role to doctor in Auth Context
      setDemoUser("doctor");
      router.push("/doctor/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in as doctor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setDemoUser("doctor");
    router.push("/doctor/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand logo header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h1 className="font-heading font-black text-2xl text-white tracking-tight">
                MediVault <span className="text-cyan-400">EMR</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Physician & Medical Portal</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="font-heading font-bold text-xl text-white">Doctor Sign In</h2>
            <p className="text-xs text-slate-400">Access verified patient health records & AI clinical tools</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Medical License Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="dr.smith@hospital.org"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <Link href="#" className="text-xs text-cyan-400 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Verifying Credentials..." : "Access Doctor Dashboard"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Doctor Button */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <span>Instant Demo Access (Dr. Sarah Jenkins)</span>
            </button>

            <div className="text-center text-xs text-slate-400">
              New Physician?{" "}
              <Link href="/doctor/auth/signup" className="text-cyan-400 font-semibold hover:underline">
                Apply for Medical Verification
              </Link>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Doctor Identity & License Verification Required</span>
        </div>
      </div>
    </div>
  );
}
