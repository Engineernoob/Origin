"use client";
import React from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isCreator?: boolean;
  isVerified?: boolean;
} | null;

type Ctx = {
  user: AuthUser;
  setUser: (u: AuthUser) => void;
  signOut: () => void;
};

const AuthContext = React.createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser>(null);

  const signOut = () => {
    // TODO: call your backend logout endpoint if you have one
    setUser(null);
  };

  const value = React.useMemo(() => ({ user, setUser, signOut }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
