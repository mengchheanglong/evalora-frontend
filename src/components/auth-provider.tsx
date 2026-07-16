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
  loginWithGoogle(credential: string, organizationName?: string): Promise<AuthUser>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_CACHE_KEY = "evalora-auth-user";

function readCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      // /auth/me is a soft probe: the current user when signed in, or null.
      const currentUser = await apiGet<AuthUser | null>("/auth/me");
      if (currentUser?.id) {
        setUser(currentUser);
        setStatus("authenticated");
        writeCachedUser(currentUser);
      } else {
        setUser(null);
        setStatus("anonymous");
        writeCachedUser(null);
      }
    } catch {
      setUser(null);
      setStatus("anonymous");
      writeCachedUser(null);
    }
  }, []);

  useEffect(() => {
    // Instant shell paint from session cache, then revalidate with /auth/me.
    const cached = readCachedUser();
    if (cached) {
      setUser(cached);
      setStatus("authenticated");
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiPost<AuthResponse>("/auth/login", input);
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiPost<AuthResponse>("/auth/register", input);
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user);
    return result.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string, organizationName?: string) => {
    const result = await apiPost<AuthResponse>("/auth/google", {
      credential,
      organizationName: organizationName?.trim() || undefined,
    });
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost<{ message: string }>("/auth/logout");
    } finally {
      setUser(null);
      setStatus("anonymous");
      writeCachedUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, loginWithGoogle, logout, refresh }),
    [user, status, login, register, loginWithGoogle, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
