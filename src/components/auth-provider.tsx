"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type LoginInput = { email: string; password: string };
type RegisterInput = { name: string; email: string; password: string; organizationName?: string };

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login(input: LoginInput): Promise<AuthUser>;
  register(input: RegisterInput): Promise<AuthUser>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const currentUser = await apiGet<AuthUser>("/auth/me");
      setUser(currentUser);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiPost<AuthResponse>("/auth/login", input);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiPost<AuthResponse>("/auth/register", input);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost<{ message: string }>("/auth/logout");
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout, refresh }), [user, status, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
