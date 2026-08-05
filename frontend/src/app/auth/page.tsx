"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth, UserRole } from "@/context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        router.push("/");
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
          router.push("/");
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
    <div style={{ background: "var(--mv-bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Orbs background */}
        <div className="grid-pattern" />
        <div
          className="orb"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(14,116,144,0.2), transparent 70%)",
            top: "10%",
            left: "10%",
          }}
        />
        <div
          className="orb"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
            bottom: "10%",
            right: "10%",
          }}
        />

        <div
          className="glass-card"
          style={{
            maxWidth: 460,
            width: "100%",
            padding: "40px 36px",
            position: "relative",
            zIndex: 2,
            boxShadow: "var(--mv-shadow-lg), 0 0 60px rgba(34,211,238,0.1)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #0e7490, #0f766e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 0 24px rgba(14, 116, 144, 0.4)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6" />
                <path d="M12 9v6" />
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
              </svg>
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p style={{ color: "var(--mv-text-secondary)", fontSize: "0.9rem" }}>
              {isLogin ? "Access your secure MediVault health profile" : "Join MediVault — Your Health, Your Data, Your Control"}
            </p>
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--mv-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { id: "patient", label: "Patient", icon: "👤" },
                { id: "doctor", label: "Doctor", icon: "👨‍⚕️" },
                { id: "hospital", label: "Hospital", icon: "🏥" },
              ].map((roleItem) => (
                <button
                  key={roleItem.id}
                  type="button"
                  onClick={() => setSelectedRole(roleItem.id as UserRole)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: selectedRole === roleItem.id ? "1.5px solid var(--mv-accent-cyan)" : "1px solid var(--mv-border)",
                    background: selectedRole === roleItem.id ? "rgba(34,211,238,0.1)" : "rgba(20,28,51,0.5)",
                    color: selectedRole === roleItem.id ? "var(--mv-accent-cyan)" : "var(--mv-text-secondary)",
                    cursor: "pointer",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{roleItem.icon}</span>
                  {roleItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 10,
                color: "#f87171",
                fontSize: "0.85rem",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 10,
                color: "#34d399",
                fontSize: "0.85rem",
                marginBottom: 20,
              }}
            >
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--mv-text-muted)", marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "rgba(15, 22, 41, 0.7)",
                    border: "1px solid var(--mv-border)",
                    borderRadius: 10,
                    color: "var(--mv-text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--mv-text-muted)", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(15, 22, 41, 0.7)",
                  border: "1px solid var(--mv-border)",
                  borderRadius: 10,
                  color: "var(--mv-text-primary)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--mv-text-muted)", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(15, 22, 41, 0.7)",
                  border: "1px solid var(--mv-border)",
                  borderRadius: 10,
                  color: "var(--mv-text-primary)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                marginTop: 8,
                fontSize: "0.95rem",
                borderRadius: 10,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Processing..." : isLogin ? "Sign In with Supabase" : "Create Supabase Account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--mv-border)" }} />
            <span style={{ color: "var(--mv-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--mv-border)" }} />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "1px solid var(--mv-border)",
              background: "rgba(20, 28, 51, 0.5)",
              color: "var(--mv-text-primary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
            </svg>
            Continue with Google
          </button>

          {/* Toggle Login/Signup */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--mv-text-secondary)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--mv-accent-cyan)",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
