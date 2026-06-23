"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  employerLogin,
  employerRegister,
  type EmployerAuth,
} from "@/lib/employer-api";

/**
 * Employer session for the real backend (Assignment 2.1 — "post a job").
 *
 * This is SEPARATE from the candidate AuthContext (which backs onto this app's
 * mock auth routes). Here we hold a real JWT issued by the ASP.NET backend, so
 * the "post a job" form can call POST /api/jobs with a bearer token. The token
 * is persisted in localStorage so a refresh keeps the employer signed in.
 *
 * A JWT is a bearer credential; localStorage is readable by any script on the
 * origin. That is an acceptable trade-off for this assignment's scope, but it is
 * called out here deliberately — a production app would prefer an httpOnly cookie.
 */
interface EmployerAuthValue {
  employer: EmployerAuth | null;
  /** True once we've read localStorage, so gates don't flash on first paint. */
  ready: boolean;
  login: (email: string, password: string) => Promise<EmployerAuth>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    companyId: string;
  }) => Promise<EmployerAuth>;
  logout: () => void;
}

const STORAGE_KEY = "careerhub:employer";

const EmployerAuthContext = createContext<EmployerAuthValue | null>(null);

export function EmployerAuthProvider({ children }: { children: ReactNode }) {
  const [employer, setEmployer] = useState<EmployerAuth | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a persisted session once, after mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEmployer(JSON.parse(raw) as EmployerAuth);
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  const persist = useCallback((auth: EmployerAuth) => {
    setEmployer(auth);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // storage may be unavailable (private mode) — session stays in memory
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await employerLogin(email, password);
      persist(auth);
      return auth;
    },
    [persist],
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      companyId: string;
    }) => {
      const auth = await employerRegister(input);
      persist(auth);
      return auth;
    },
    [persist],
  );

  const logout = useCallback(() => {
    setEmployer(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<EmployerAuthValue>(
    () => ({ employer, ready, login, register, logout }),
    [employer, ready, login, register, logout],
  );

  return (
    <EmployerAuthContext.Provider value={value}>
      {children}
    </EmployerAuthContext.Provider>
  );
}

export function useEmployerAuth(): EmployerAuthValue {
  const ctx = useContext(EmployerAuthContext);
  if (!ctx) {
    throw new Error("useEmployerAuth must be used within an EmployerAuthProvider");
  }
  return ctx;
}
