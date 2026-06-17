"use client";

/**
 * Mock authentication for the frontend-only milestone.
 *
 * There is no auth API yet, so accounts live in localStorage. The PUBLIC SHAPE
 * of this context (user, signIn, signUp, signOut, requestPasswordReset) is the
 * same shape a real API-backed provider will expose in a later assignment.
 * When the live endpoints land, only the bodies of these functions change —
 * every screen that consumes `useAuth()` stays exactly the same. That is the
 * data-source-agnostic principle applied to auth.
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

interface StoredAccount extends User {
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
}

const ACCOUNTS_KEY = "careerhub.accounts";
const SESSION_KEY = "careerhub.session";

const AuthContext = createContext<AuthContextValue | null>(null);

function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      await delay(450);
      const normalised = email.trim().toLowerCase();
      const account = readAccounts().find((a) => a.email === normalised);
      if (!account || account.password !== password) {
        throw new Error("Email or password is incorrect.");
      }
      const { password: _password, ...safe } = account;
      void _password;
      persistSession(safe);
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await delay(450);
      const normalised = email.trim().toLowerCase();
      const accounts = readAccounts();
      if (accounts.some((a) => a.email === normalised)) {
        throw new Error("An account with this email already exists.");
      }
      const account: StoredAccount = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalised,
        password,
      };
      writeAccounts([...accounts, account]);
      const { password: _password, ...safe } = account;
      void _password;
      persistSession(safe);
    },
    [persistSession],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await delay(450);
    const normalised = email.trim().toLowerCase();
    const exists = readAccounts().some((a) => a.email === normalised);
    // Deliberately do not reveal whether the address exists — same response
    // either way, mirroring how a real reset endpoint avoids account discovery.
    if (!exists) {
      // no-op on purpose
    }
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
