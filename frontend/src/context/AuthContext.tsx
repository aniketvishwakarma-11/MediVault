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
      }
      setLoading(false);
    });

    // Listen to Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        updateProfileState(session.user);
      } else {
        setUserProfile(null);
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
