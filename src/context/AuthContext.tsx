"use client";

/**
 * Real, API-backed authentication.
 *
 * Accounts are persisted server-side in the file-based store (via the
 * `/api/auth/*` routes) — exactly like the job and application data. This
 * context only keeps the *session* (the currently signed-in safe user) in
 * localStorage so a reload doesn't sign the user out; it never stores
 * passwords or the account list in the browser.
 *
 * The PUBLIC SHAPE (user, signIn, signUp, signOut, requestPasswordReset) is
 * unchanged, so every screen that consumes `useAuth()` keeps working.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { signupRequest, loginRequest } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
}

const SESSION_KEY = "careerhub.session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Restore an existing session on first mount (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      // ignore malformed session
    } finally {
      setIsReady(true);
    }
  }, []);

  const persistSession = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Verify against the real API; the route throws on bad credentials.
      const { user: authed } = await loginRequest({ email, password });
      persistSession(authed);
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      // Create the account in the real server store, then start the session.
      const { user: created } = await signupRequest({ name, email, password });
      persistSession(created);
    },
    [persistSession],
  );

  const requestPasswordReset = useCallback(async (_email: string) => {
    // Password reset is out of scope for this milestone; the endpoint isn't
    // built yet. Resolve silently either way so the screen never reveals
    // whether an address is registered (avoids account discovery).
    void _email;
  }, []);

  const signOut = useCallback(() => {
    persistSession(null);
  }, [persistSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isReady, signIn, signUp, signOut, requestPasswordReset }),
    [user, isReady, signIn, signUp, signOut, requestPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
