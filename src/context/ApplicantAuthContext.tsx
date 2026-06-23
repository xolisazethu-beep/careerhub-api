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
  applicantLogin,
  applicantRegister,
  type ApplicantAuth,
} from "@/lib/applicant-api";

/**
 * Real applicant session for the backend (apply + track on Postgres).
 *
 * Separate from the employer session and from the legacy mock candidate auth:
 * here we hold a real JWT issued by the ASP.NET backend so the applicant can
 * POST an application (with CV + skills) and read their own status history. The
 * token is persisted in localStorage so a refresh keeps the applicant signed in.
 */
interface ApplicantAuthValue {
  applicant: ApplicantAuth | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<ApplicantAuth>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<ApplicantAuth>;
  logout: () => void;
}

const STORAGE_KEY = "careerhub:applicant";

const ApplicantAuthContext = createContext<ApplicantAuthValue | null>(null);

export function ApplicantAuthProvider({ children }: { children: ReactNode }) {
  const [applicant, setApplicant] = useState<ApplicantAuth | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setApplicant(JSON.parse(raw) as ApplicantAuth);
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  const persist = useCallback((auth: ApplicantAuth) => {
    setApplicant(auth);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // storage unavailable — session stays in memory
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await applicantLogin(email, password);
      persist(auth);
      return auth;
    },
    [persist],
  );

  const register = useCallback(
    async (input: { fullName: string; email: string; password: string }) => {
      const auth = await applicantRegister(input);
      persist(auth);
      return auth;
    },
    [persist],
  );

  const logout = useCallback(() => {
    setApplicant(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ApplicantAuthValue>(
    () => ({ applicant, ready, login, register, logout }),
    [applicant, ready, login, register, logout],
  );

  return (
    <ApplicantAuthContext.Provider value={value}>
      {children}
    </ApplicantAuthContext.Provider>
  );
}

export function useApplicantAuth(): ApplicantAuthValue {
  const ctx = useContext(ApplicantAuthContext);
  if (!ctx) {
    throw new Error(
      "useApplicantAuth must be used within an ApplicantAuthProvider",
    );
  }
  return ctx;
}
