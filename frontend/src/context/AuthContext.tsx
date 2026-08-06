"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "patient" | "doctor" | "hospital";

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
  isProfileCompleted: boolean | null;
  refreshProfileCompletion: () => Promise<boolean>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setRole: (role: UserRole) => void;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>("patient");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean | null>(null);

  const checkProfileCompletion = async (currentUser: User): Promise<boolean> => {
    try {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", currentUser.id)
        .maybeSingle();

      const { data: patientRow } = await supabase
        .from("patients")
        .select("blood_group, date_of_birth, height, weight")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      const isNameOk = Boolean(profileRow?.full_name && profileRow.full_name.trim().length > 0);
      const isPhoneOk = Boolean(profileRow?.phone && profileRow.phone !== "Not provided" && profileRow.phone.trim().length >= 8);
      const isBloodOk = Boolean(patientRow?.blood_group && patientRow.blood_group !== "Not provided" && patientRow.blood_group.trim().length > 0);
      const isDobOk = Boolean(
        patientRow?.date_of_birth &&
        String(patientRow.date_of_birth) !== "Not provided" &&
        String(patientRow.date_of_birth).trim() !== "" &&
        !isNaN(new Date(patientRow.date_of_birth).getTime())
      );
      const isHeightOk = Boolean(patientRow?.height && String(patientRow.height).trim().length > 0 && String(patientRow.height) !== "Not provided");
      const isWeightOk = Boolean(patientRow?.weight && String(patientRow.weight).trim().length > 0 && String(patientRow.weight) !== "Not provided");

      const completed = isNameOk && isPhoneOk && isBloodOk && isDobOk && isHeightOk && isWeightOk;
      setIsProfileCompleted(completed);
      return completed;
    } catch (err) {
      console.warn("Profile completion check warning:", err);
      setIsProfileCompleted(true);
      return true;
    }
  };

  const refreshProfileCompletion = async (): Promise<boolean> => {
    if (!user) {
      setIsProfileCompleted(false);
      return false;
    }
    return checkProfileCompletion(user);
  };

  useEffect(() => {
    // Read saved role
    const savedRole = localStorage.getItem("medivault_user_role") as UserRole;
    if (savedRole) {
      setRoleState(savedRole);
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        updateProfileState(session.user);
        checkProfileCompletion(session.user);
      } else {
        setIsProfileCompleted(false);
      }
      setLoading(false);
    });

    // Listen to Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        updateProfileState(session.user);
        checkProfileCompletion(session.user);
      } else {
        setUserProfile(null);
        setIsProfileCompleted(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateProfileState = (currentUser: User) => {
    const activeRole = (localStorage.getItem("medivault_user_role") as UserRole) || "patient";
    setUserProfile({
      uid: currentUser.id,
      email: currentUser.email || null,
      displayName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "User",
      role: activeRole,
    });
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("medivault_user_role", newRole);
    if (userProfile) {
      setUserProfile({ ...userProfile, role: newRole });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("medivault_user_role");
    setIsProfileCompleted(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        isProfileCompleted,
        refreshProfileCompletion,
        logout,
        signInWithGoogle,
        setRole,
        role,
      }}
    >
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
