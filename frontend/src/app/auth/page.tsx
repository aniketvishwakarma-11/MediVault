"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  KeyRound,
  Activity,
  Cpu,
  Check,
  ShieldAlert,
  Loader2
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

  const { user, userProfile, isDemo, role, loading: authLoading, signInWithGoogle, setRole, setDemoUser } = useAuth();
  const router = useRouter();
  const isRedirectingRef = useRef(false);

  // Auto-redirect away from /auth if there is an ACTIVE real user session based on their authoritative role
  useEffect(() => {
    if (authLoading || !user || isDemo || isRedirectingRef.current) return;

    let isMounted = true;

    async function checkAndRedirect() {
      if (isRedirectingRef.current) return;
      isRedirectingRef.current = true;

      let activeRole: UserRole = "patient";
      try {
        const { data } = await supabase
          .from("users_profile")
          .select("role")
          .eq("id", user!.id)
          .maybeSingle();

        if (data?.role) {
          activeRole = String(data.role).toLowerCase() as UserRole;
        } else {
          activeRole = ((localStorage.getItem("medivault_user_role") as UserRole) || "patient");
        }
      } catch {
        activeRole = ((localStorage.getItem("medivault_user_role") as UserRole) || "patient");
      }

      if (!isMounted) return;

      setRole(activeRole);
      localStorage.setItem("medivault_user_role", activeRole);

      let target = "/patient/dashboard";
      if (activeRole === "doctor") target = "/doctor/dashboard";
      else if (activeRole === "admin") target = "/admin/dashboard";
      else if (activeRole === "hospital") target = "/patient/dashboard";

      // Check for authorized redirect query parameter
      if (typeof window !== "undefined") {
        try {
          const params = new URLSearchParams(window.location.search);
          const redirectParam = params.get("redirect");
          if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
            const isRoleAllowed =
              (activeRole === "doctor" && redirectParam.startsWith("/doctor")) ||
              (activeRole === "patient" && redirectParam.startsWith("/patient")) ||
              (activeRole === "admin" && redirectParam.startsWith("/admin"));
            if (isRoleAllowed) {
              target = redirectParam;
            }
          }
        } catch {}
      }

      // If URL has OAuth hash (#access_token=...), wipe hash and perform clean client replace
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        window.location.replace(target);
      } else {
        router.replace(target);
      }
    }

    checkAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [user, isDemo, authLoading, router, setRole]);


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        // ── SIGN IN: Authenticate with credentials and auto-route to user's assigned role ──
        const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw authError;
        }

        localStorage.removeItem("medivault_is_demo");

        // Fetch user's authoritative role from database
        let userRole: UserRole = "patient";
        if (signInData?.user?.id) {
          const { data: prof } = await supabase
            .from("users_profile")
            .select("role")
            .eq("id", signInData.user.id)
            .maybeSingle();

          if (prof?.role) {
            userRole = (String(prof.role).toLowerCase() as UserRole);
          } else {
            const { data: doc } = await supabase
              .from("doctors")
              .select("id")
              .eq("user_id", signInData.user.id)
              .maybeSingle();
            if (doc?.id) {
              userRole = "doctor";
            }
          }
        }

        isRedirectingRef.current = true;
        setRole(userRole);
        localStorage.setItem("medivault_user_role", userRole);

        let target = "/patient/dashboard";
        if (userRole === "doctor") target = "/doctor/dashboard";
        else if (userRole === "admin") target = "/admin/dashboard";

        if (typeof window !== "undefined") {
          try {
            const params = new URLSearchParams(window.location.search);
            const redirectParam = params.get("redirect");
            if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
              const isRoleAllowed =
                (userRole === "doctor" && redirectParam.startsWith("/doctor")) ||
                (userRole === "patient" && redirectParam.startsWith("/patient")) ||
                (userRole === "admin" && redirectParam.startsWith("/admin"));
              if (isRoleAllowed) {
                target = redirectParam;
              }
            }
          } catch {}
        }
        
        router.replace(target);
      } else {
        // ── REGISTER: Create new user with their chosen selectedRole ──
        setRole(selectedRole);
        localStorage.setItem("medivault_user_role", selectedRole);

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: selectedRole,
            },
          },
        });

        if (signUpErr) throw signUpErr;

        localStorage.removeItem("medivault_is_demo");

        if (selectedRole === "doctor") {
          isRedirectingRef.current = true;
          router.replace("/doctor/auth/signup");
        } else if (data.session) {
          isRedirectingRef.current = true;
          router.replace("/patient/dashboard");
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
    isRedirectingRef.current = true;
    setSelectedRole(demoRole);
    setEmail(demoRole === "patient" ? "patient@medivault.local" : "dr.jenkins@medivault.org");
    setPassword("password123");
    setDemoUser(demoRole);
    if (demoRole === "doctor") {
      router.replace("/doctor/dashboard");
    } else {
      router.replace("/patient/dashboard");
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!isLogin) {
        // When registering via Google, save intended role so onboarding/trigger picks it up
        setRole(selectedRole);
        localStorage.setItem("medivault_user_role", selectedRole);
      }
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F0FDFA] text-[#0F172A] flex flex-col font-body">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 lg:pt-28 pb-12 flex items-center justify-center relative overflow-hidden px-3 sm:px-6 lg:px-8">
        {/* Background Ambient Glows */}
        <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-200/50 via-teal-200/30 to-emerald-200/40 blur-3xl rounded-full pointer-events-none -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] bg-gradient-to-tr from-emerald-200/40 via-cyan-200/40 to-teal-100/50 blur-3xl rounded-full pointer-events-none -z-10" />

        {/* ========================================================= */}
        {/* MOBILE VIEW (< lg): EXACT ORIGINAL SINGLE CENTERED CARD */}
        {/* ========================================================= */}
        <div className="block lg:hidden w-full max-w-xl relative z-10">
          <div className="bg-white/98 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-8 md:p-10 space-y-5 sm:space-y-6">
            
            {/* Header Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-200 mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                {isLogin ? "Welcome Back to MediVault" : "Create Patient Identity"}
              </h1>
              <p className="text-sm text-[#475569]">
                {isLogin
                  ? "Access your zero-knowledge encrypted medical records"
                  : "Start securing your medical identity in under 2 minutes"}
              </p>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="p-4 rounded-2xl bg-cyan-50/80 border border-cyan-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#0891B2]">
                <span className="flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-4 h-4 text-[#0891B2]" />
                  Instant Demo Portal Access
                </span>
                <span className="text-[10px] text-[#0891B2] bg-white px-2 py-0.5 rounded border border-cyan-200 font-semibold">No Password Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("patient")}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-cyan-100 text-[#0891B2] text-xs font-bold border border-cyan-200 transition-all flex items-center justify-center gap-2 shadow-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                >
                  <User className="w-4 h-4 text-[#0891B2]" />
                  Demo Patient Login
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("doctor")}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-100 text-[#065F46] text-xs font-bold border border-emerald-200 transition-all flex items-center justify-center gap-2 shadow-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
                >
                  <Stethoscope className="w-4 h-4 text-[#22C55E]" />
                  Demo Doctor Login
                </button>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                  isLogin ? "bg-white text-[#0F172A] shadow-sm font-heading" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                  !isLogin ? "bg-white text-[#0F172A] shadow-sm font-heading" : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error / Success Messages */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#991B1B] text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#065F46] text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Role Selection (Only shown when registering a new account) */}
              {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider font-heading">
                    Account Role
                  </label>
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
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all min-h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                          selectedRole === role.id
                            ? "bg-cyan-50 border-[#0891B2] text-[#0891B2] shadow-xs"
                            : "bg-white border-slate-200 text-[#475569] hover:bg-slate-50"
                        }`}
                      >
                        <role.icon className="w-4 h-4" />
                        <span>{role.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F172A]">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@medivault.local"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A]">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-[#0F172A] min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-base shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{isLogin ? "Sign In to Portal" : "Create Account"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-[#475569] uppercase tracking-wider absolute">OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-[#0F172A] font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2.5 shadow-xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
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

        {/* ========================================================= */}
        {/* WEB VIEW (lg:): ULTRA-CREATIVE 2-COLUMN SPLIT DESKTOP */}
        {/* ========================================================= */}
        <div className="hidden lg:block w-full max-w-6xl mx-auto relative z-10 my-auto">
          <div className="grid grid-cols-12 gap-10 items-center">
            
            {/* LEFT COLUMN: Interactive Visual Cryptographic Vault Card */}
            <div className="col-span-6 space-y-6">
              
              {/* Top Pill & Main Heading */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-100 via-teal-100 to-emerald-100 border border-cyan-300 text-[#0891B2] text-xs font-extrabold tracking-wide font-heading shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#0891B2] animate-ping" />
                  <ShieldCheck className="w-4 h-4 text-[#0891B2]" />
                  Zero-Knowledge Proof Security Engine
                </div>

                <h1 className="font-heading text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
                  Decentralized <br />
                  <span className="bg-gradient-to-r from-[#0891B2] via-[#0d9488] to-[#22C55E] bg-clip-text text-transparent">
                    Health Identity
                  </span>
                </h1>

                <p className="text-sm text-[#475569] max-w-md leading-relaxed font-medium">
                  Cryptographically secured medical records powered by ZK-SNARKs and AI diagnostics. Your health data remains 100% private to you.
                </p>
              </div>

              {/* High-End Visual Card Widget */}
              <div className="relative p-6 rounded-3xl bg-gradient-to-br from-white/90 via-cyan-50/60 to-emerald-50/50 backdrop-blur-2xl border border-cyan-200/90 shadow-xl overflow-hidden group">
                
                {/* Visual Glass Accent Lines */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-2xl pointer-events-none" />

                {/* Top Status Header */}
                <div className="flex items-center justify-between pb-4 border-b border-cyan-200/60 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] font-heading">Encrypted Identity Vault</div>
                      <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        AES-256 Protocol Active
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-[10px] font-bold text-[#0891B2] shadow-2xs">
                    ZKP Verified
                  </span>
                </div>

                {/* Interactive Instant Demo Access Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] font-heading">
                    <span className="flex items-center gap-1.5 text-[#0891B2]">
                      <Sparkles className="w-4 h-4 text-[#0891B2]" />
                      Instant Demo Portal Access
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                      ⚡ One-Click Login
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleDemoLogin("patient")}
                      className="p-3.5 rounded-2xl bg-white hover:bg-cyan-50/90 text-[#0891B2] border border-cyan-200/90 shadow-sm hover:shadow-md hover:border-[#0891B2] transition-all flex items-center gap-3 group/btn text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] flex items-center justify-center shrink-0 group-hover/btn:bg-[#0891B2] group-hover/btn:text-white transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] group-hover/btn:text-[#0891B2] transition-colors">Patient Portal</div>
                        <div className="text-[10px] text-[#475569] font-medium">Test Profile &rarr;</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoLogin("doctor")}
                      className="p-3.5 rounded-2xl bg-white hover:bg-emerald-50/90 text-[#065F46] border border-emerald-200/90 shadow-sm hover:shadow-md hover:border-[#22C55E] transition-all flex items-center gap-3 group/btn text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#22C55E] flex items-center justify-center shrink-0 group-hover/btn:bg-[#22C55E] group-hover/btn:text-white transition-colors">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] group-hover/btn:text-[#065F46] transition-colors">Doctor Portal</div>
                        <div className="text-[10px] text-[#475569] font-medium">Clinical Pass &rarr;</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Feature Chips */}
                <div className="mt-4 pt-3.5 border-t border-cyan-200/60 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-[#475569]">
                  <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/60 border border-slate-200/60">
                    <Check className="w-3.5 h-3.5 text-[#0891B2]" />
                    <span>HIPAA Ready</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/60 border border-slate-200/60">
                    <Activity className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>AI Diagnostics</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/60 border border-slate-200/60">
                    <Cpu className="w-3.5 h-3.5 text-cyan-600" />
                    <span>FHIR Compatible</span>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: Modern Form Card */}
            <div className="col-span-6">
              <div className="bg-white/98 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl p-7 space-y-4 relative">
                
                {/* Header & Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-heading text-2xl font-extrabold text-[#0F172A] tracking-tight">
                        {isLogin ? "Sign In to Vault" : "Create Patient Identity"}
                      </h2>
                      <p className="text-xs text-[#475569] mt-0.5 font-medium">
                        {isLogin
                          ? "Access your zero-knowledge medical profile"
                          : "Set up your encrypted healthcare credentials"}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-200 flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Mode Switch Pills */}
                  <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
                      className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] cursor-pointer ${
                        isLogin ? "bg-white text-[#0F172A] shadow-xs font-heading" : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
                      className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] cursor-pointer ${
                        !isLogin ? "bg-white text-[#0F172A] shadow-xs font-heading" : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                {/* Error / Success Messages */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#991B1B] text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#065F46] text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{message}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-3">
                  
                  {/* Account Role Buttons (Only shown when registering a new account) */}
                  {!isLogin && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider font-heading">
                        Select Role
                      </label>
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
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] cursor-pointer ${
                              selectedRole === role.id
                                ? "bg-cyan-50 border-[#0891B2] text-[#0891B2] shadow-xs"
                                : "bg-white border-slate-200 text-[#475569] hover:bg-slate-50"
                            }`}
                          >
                            <role.icon className="w-3.5 h-3.5" />
                            <span>{role.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}


                  {!isLogin && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#0F172A]">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F172A]">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@medivault.local"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F172A]">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] cursor-pointer mt-2"
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

                <div className="relative flex items-center justify-center my-1.5">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[10px] font-bold text-[#475569] uppercase tracking-wider absolute">OR</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full py-2 rounded-xl bg-white border border-slate-200 text-[#0F172A] font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] cursor-pointer"
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

          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}

