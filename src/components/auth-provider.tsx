"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { AuthResponse, AuthUser, EmailVerificationRequestResponse, RegistrationResponse } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type LoginInput = { email: string; password: string; remember?: boolean };
type RegisterInput = { name: string; email: string; password: string; organizationName?: string };

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login(input: LoginInput): Promise<AuthUser>;
  register(input: RegisterInput): Promise<RegistrationResponse>;
  verifyEmail(token: string): Promise<AuthUser>;
  resendEmailVerification(email: string): Promise<EmailVerificationRequestResponse>;
  loginWithGoogle(credential: string, organizationName?: string, remember?: boolean): Promise<AuthUser>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_CACHE_KEY = "evalora-auth-user";

type CachedUser = { user: AuthUser; remembered: boolean };

function parseCachedUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as AuthUser;
  if (!parsed?.id || !parsed?.email || !parsed?.role) return null;
  return parsed;
}

function readCachedUser(): CachedUser | null {
  if (typeof window === "undefined") return null;
  try {
    const persistentUser = parseCachedUser(localStorage.getItem(AUTH_CACHE_KEY));
    if (persistentUser) return { user: persistentUser, remembered: true };
  } catch {}
  try {
    const sessionUser = parseCachedUser(sessionStorage.getItem(AUTH_CACHE_KEY));
    return sessionUser ? { user: sessionUser, remembered: false } : null;
  } catch {}
  return null;
}

function writeCachedUser(user: AuthUser | null, remembered = false) {
  if (typeof window === "undefined") return;
  try {
    if (!user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }
    const encodedUser = JSON.stringify(user);
    if (remembered) {
      localStorage.setItem(AUTH_CACHE_KEY, encodedUser);
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    } else {
      sessionStorage.setItem(AUTH_CACHE_KEY, encodedUser);
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    const remembered = readCachedUser()?.remembered ?? false;
    try {
      // /auth/me is a soft probe: the current user when signed in, or null.
      const currentUser = await apiGet<AuthUser | null>("/auth/me");
      if (currentUser?.id) {
        setUser(currentUser);
        setStatus("authenticated");
        writeCachedUser(currentUser, remembered);
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
      setUser(cached.user);
      setStatus("authenticated");
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiPost<AuthResponse>("/auth/login", input);
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user, input.remember === true);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    return apiPost<RegistrationResponse>("/auth/register", input);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    const result = await apiPost<AuthResponse>("/auth/verify-email", { token });
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user);
    return result.user;
  }, []);

  const resendEmailVerification = useCallback(async (email: string) => {
    return apiPost<EmailVerificationRequestResponse>("/auth/resend-email-verification", { email });
  }, []);

  const loginWithGoogle = useCallback(async (credential: string, organizationName?: string, remember = false) => {
    const result = await apiPost<AuthResponse>("/auth/google", {
      credential,
      organizationName: organizationName?.trim() || undefined,
      remember,
    });
    setUser(result.user);
    setStatus("authenticated");
    writeCachedUser(result.user, remember);
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
    () => ({ user, status, login, register, verifyEmail, resendEmailVerification, loginWithGoogle, logout, refresh }),
    [user, status, login, register, verifyEmail, resendEmailVerification, loginWithGoogle, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
