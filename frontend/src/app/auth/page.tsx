"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth, UserRole } from "@/context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("patient");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, setRole } = useAuth();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setRole(selectedRole);
        router.push("/patient/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: selectedRole,
            },
          },
        });
        if (error) throw error;
        setRole(selectedRole);

        if (data.session) {
          router.push("/patient/dashboard");
        } else {
          setMessage("Registration successful! Please check your email to confirm your account.");
        }
      }
    } catch (err: any) {
      console.error("Supabase Auth error:", err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: UserRole) => {
    setSelectedRole(demoRole);
    setEmail(demoRole === "patient" ? "patient@medivault.local" : "doctor@hospital.org");
    setPassword("password123");
    setRole(demoRole);
    router.push("/patient/dashboard");
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      setRole(selectedRole);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 flex items-center justify-center relative overflow-hidden px-4">
        {/* Ambient Glow */}
        <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-200/40 to-teal-200/30 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="w-full max-w-xl relative z-10">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 space-y-6">
            
            {/* Header Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLogin ? "Welcome Back to MediVault" : "Create Patient Identity"}
              </h1>
              <p className="text-sm text-slate-500">
                {isLogin
                  ? "Access your zero-knowledge encrypted medical records"
                  : "Start securing your medical identity in under 2 minutes"}
              </p>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Instant Demo Portal Access
                </span>
                <span className="text-[10px] text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200">No Password Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("patient")}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  Demo Patient Login
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("doctor")}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Demo Doctor Login
                </button>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                  isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                  !isLogin ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error / Success Messages */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "patient", label: "Patient", icon: User },
                    { id: "doctor", label: "Doctor", icon: Stethoscope },
                    { id: "admin", label: "Facility", icon: Building2 },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id as UserRole)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        selectedRole === role.id
                          ? "bg-sky-50 border-sky-500 text-sky-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <role.icon className="w-4 h-4" />
                      <span>{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@medivault.local"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{isLogin ? "Sign In to Portal" : "Create Account"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2.5 shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google Identity</span>
            </button>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
