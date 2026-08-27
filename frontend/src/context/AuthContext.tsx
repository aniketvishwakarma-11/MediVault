"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

import { OfflineEmergencyVault } from "@/lib/offline-emergency-vault";

export type UserRole = "patient" | "doctor" | "hospital" | "admin";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  isProfileCompleted: boolean | null;
  setIsProfileCompleted: (completed: boolean) => void;
  refreshProfileCompletion: () => Promise<boolean>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setDemoUser: (role: UserRole) => void;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookies(role: string, isDemo: boolean = false) {
  if (typeof document === "undefined") return;
  const maxAge = isDemo ? 86400 : 604800; // 1 day for demo, 7 days for real
  document.cookie = `medivault_auth=true; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `medivault_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (isDemo) {
    document.cookie = `medivault_is_demo=true; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `medivault_is_demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `medivault_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `medivault_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `medivault_is_demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>("patient");
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean | null>(null);

  const checkProfileCompletion = useCallback(async (currentUser: User): Promise<boolean> => {
    try {
      const activeRole = (localStorage.getItem("medivault_user_role") as UserRole) || currentUser.user_metadata?.role || "patient";

      // Admins and hospitals are always considered profile-complete — no patient/doctor form required
      if (activeRole === "admin" || activeRole === "hospital") {
        setIsProfileCompleted(true);
        return true;
      }

      if (activeRole === "doctor") {
        if (typeof window !== "undefined" && currentUser?.id) {
          const localDone = localStorage.getItem(`medivault_doctor_completed_${currentUser.id}`);
          if (localDone === "true") {
            setIsProfileCompleted(true);
            return true;
          }
        }

        const { data: profileRow } = await supabase
          .from("users_profile")
          .select("full_name")
          .eq("id", currentUser.id)
          .maybeSingle();

        const { data: docRow } = await supabase
          .from("doctors")
          .select("license_number, specialization")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        const isNameOk = Boolean(profileRow?.full_name && profileRow.full_name.trim().length > 0);
        const isLicenseOk = Boolean(docRow?.license_number && docRow.license_number.trim().length > 0);

        const completed = isNameOk && isLicenseOk;
        setIsProfileCompleted(completed);
        return completed;
      }

      // Patient profile check
      const { data: profileRow } = await supabase
        .from("users_profile")
        .select("full_name, phone")
        .eq("id", currentUser.id)
        .maybeSingle();

      const { data: patientRow } = await supabase
        .from("patients")
        .select("blood_group, date_of_birth, vitals_json")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      let vitalsObj: any = {};
      if (typeof patientRow?.vitals_json === "string") {
        try { vitalsObj = JSON.parse(patientRow.vitals_json); } catch {}
      } else if (patientRow?.vitals_json && typeof patientRow.vitals_json === "object") {
        vitalsObj = patientRow.vitals_json;
      }
      const heightVal = vitalsObj.height || (patientRow as any)?.height || "";
      const weightVal = vitalsObj.weight || (patientRow as any)?.weight || "";

      const isNameOk = Boolean(profileRow?.full_name && profileRow.full_name.trim().length > 0);
      const isPhoneOk = Boolean(profileRow?.phone && profileRow.phone !== "Not provided" && profileRow.phone.trim().length >= 8);
      const isBloodOk = Boolean(patientRow?.blood_group && patientRow.blood_group !== "Not provided" && patientRow.blood_group.trim().length > 0);
      const isDobOk = Boolean(
        patientRow?.date_of_birth &&
        String(patientRow.date_of_birth) !== "Not provided" &&
        String(patientRow.date_of_birth).trim() !== "" &&
        !isNaN(new Date(patientRow.date_of_birth).getTime())
      );
      const isHeightOk = Boolean(heightVal && String(heightVal).trim().length > 0 && String(heightVal) !== "Not provided");
      const isWeightOk = Boolean(weightVal && String(weightVal).trim().length > 0 && String(weightVal) !== "Not provided");

      const completed = isNameOk && isPhoneOk && isBloodOk && isDobOk && isHeightOk && isWeightOk;
      setIsProfileCompleted(completed);
      return completed;
    } catch (err) {
      console.warn("Profile completion check warning:", err);
      setIsProfileCompleted(true);
      return true;
    }
  }, []);

  const refreshProfileCompletion = useCallback(async (): Promise<boolean> => {
    if (isDemo) {
      setIsProfileCompleted(true);
      return true;
    }
    if (!user) {
      setIsProfileCompleted(false);
      return false;
    }
    return checkProfileCompletion(user);
  }, [isDemo, user, checkProfileCompletion]);

  const updateProfileState = useCallback(async (currentUser: User) => {
    // Fetch user's authoritative role from database
    let realRole: UserRole = "patient";
    try {
      const { data: prof } = await supabase
        .from("users_profile")
        .select("role, full_name")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (prof?.role) {
        realRole = (String(prof.role).toLowerCase() as UserRole);
      } else {
        const { data: doc } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (doc?.id) {
          realRole = "doctor";
        } else {
          realRole = (localStorage.getItem("medivault_user_role") as UserRole) || currentUser.user_metadata?.role || "patient";
        }
      }
    } catch {
      realRole = (localStorage.getItem("medivault_user_role") as UserRole) || currentUser.user_metadata?.role || "patient";
    }

    localStorage.setItem("medivault_user_role", realRole);
    setRoleState(realRole);
    setAuthCookies(realRole, false);

    const profile: UserProfile = {
      uid: currentUser.id,
      email: currentUser.email || null,
      displayName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "User",
      role: realRole,
    };

    localStorage.setItem("medivault_cached_user_profile", JSON.stringify(profile));
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    // Read saved role & demo state
    const savedRole = localStorage.getItem("medivault_user_role") as UserRole;
    if (savedRole) {
      setRoleState(savedRole);
    }
    const savedIsDemo = localStorage.getItem("medivault_is_demo") === "true";

    // Immediate offline fallback: check if we have a cached user profile
    try {
      const cachedStr = localStorage.getItem("medivault_cached_user_profile");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as UserProfile;
        if (cached?.uid) {
          setUserProfile(cached);
          if (cached.role) setRoleState(cached.role);
        }
      }
    } catch {}

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // REAL USER LOGGED IN WITH VALID JWT SESSION
        setIsDemo(false);
        localStorage.removeItem("medivault_is_demo");
        updateProfileState(session.user);
        checkProfileCompletion(session.user);
      } else if (savedIsDemo) {
        // DEMO USER LOGGED IN (NO REAL JWT SESSION)
        setIsDemo(true);
        const demoRole = savedRole || "patient";
        setAuthCookies(demoRole, true);
        setUserProfile({
          uid: "demo-patient-123",
          email: demoRole === "patient" ? "patient@medivault.local" : "doctor@hospital.org",
          displayName: demoRole === "patient" ? "Demo Patient (Alex Morgan)" : "Dr. Sarah Jenkins (Demo)",
          role: demoRole,
        });
        setIsProfileCompleted(true);
      } else {
        setIsDemo(false);
        setIsProfileCompleted(true);
        clearAuthCookies();
      }
      setLoading(false);
    }).catch(() => {
      // Network failure / offline
      setLoading(false);
    });

    // Listen to Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Real user session detected -> clear demo flag
        setIsDemo(false);
        localStorage.removeItem("medivault_is_demo");
        updateProfileState(session.user);
        checkProfileCompletion(session.user);
      } else {
        const isStillDemo = localStorage.getItem("medivault_is_demo") === "true";
        if (isStillDemo) {
          setIsDemo(true);
          const activeRole = (localStorage.getItem("medivault_user_role") as UserRole) || "patient";
          setAuthCookies(activeRole, true);
          setUserProfile({
            uid: "demo-patient-123",
            email: activeRole === "patient" ? "patient@medivault.local" : "doctor@hospital.org",
            displayName: activeRole === "patient" ? "Demo Patient (Alex Morgan)" : "Dr. Sarah Jenkins (Demo)",
            role: activeRole,
          });
          setIsProfileCompleted(true);
        } else {
          setIsDemo(false);
          setUserProfile(null);
          setIsProfileCompleted(false);
          clearAuthCookies();
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkProfileCompletion, updateProfileState]);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("medivault_user_role", newRole);
    setAuthCookies(newRole, localStorage.getItem("medivault_is_demo") === "true");
    setUserProfile((prev) => (prev ? { ...prev, role: newRole } : null));
  }, []);

  const setDemoUser = useCallback((demoRole: UserRole) => {
    setIsDemo(true);
    setRoleState(demoRole);
    localStorage.setItem("medivault_is_demo", "true");
    localStorage.setItem("medivault_user_role", demoRole);
    setAuthCookies(demoRole, true);
    setUserProfile({
      uid: "demo-patient-123",
      email: demoRole === "patient" ? "patient@medivault.local" : "doctor@hospital.org",
      displayName: demoRole === "patient" ? "Demo Patient (Alex Morgan)" : "Dr. Sarah Jenkins (Demo)",
      role: demoRole,
    });
    setIsProfileCompleted(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("SignOut error:", err);
    }
    localStorage.removeItem("medivault_user_role");
    localStorage.removeItem("medivault_is_demo");
    localStorage.removeItem("medivault_cached_user_profile");
    OfflineEmergencyVault.clearSnapshot();
    clearAuthCookies();
    setIsDemo(false);
    setUserProfile(null);
    setIsProfileCompleted(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    localStorage.removeItem("medivault_is_demo");
    setIsDemo(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) throw error;
  }, []);

  const contextValue = useMemo(() => ({
    user,
    session,
    userProfile,
    loading,
    isDemo,
    isProfileCompleted,
    setIsProfileCompleted,
    refreshProfileCompletion,
    logout,
    signInWithGoogle,
    setRole,
    setDemoUser,
    role,
  }), [
    user,
    session,
    userProfile,
    loading,
    isDemo,
    isProfileCompleted,
    refreshProfileCompletion,
    logout,
    signInWithGoogle,
    setRole,
    setDemoUser,
    role,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

