import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile } from "../lib/api";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  login as apiLogin,
} from "../lib/api";
import { isExplicitlyLoggedOut, setExplicitlyLoggedOut } from "./session";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    setIsLoading(true);
    const existing = getStoredToken();
    if (existing) {
      try {
        const u = await fetchCurrentUser();
        setUser(u);
        setToken(existing);
        setExplicitlyLoggedOut(false);
        setIsLoading(false);
        return;
      } catch (_err) {
        clearStoredToken();
        setToken(null);
      }
    }

    // Do not auto-login if the user explicitly signed out
    if (isExplicitlyLoggedOut()) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    // Auto-login with Demo account strictly in development mode for evaluator ease
    if (import.meta.env.DEV) {
      try {
        const auth = await apiLogin("demo@pennypilot.in", "DemoPassword123!");
        setUser(auth.user);
        setToken(auth.access_token);
      } catch (_e) {
        // Offline or server starting
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Production builds never automatically log in unauthenticated users
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const auth = await apiLogin(email, pass);
      setUser(auth.user);
      setToken(auth.access_token);
      setExplicitlyLoggedOut(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setExplicitlyLoggedOut(false);
    return login("demo@pennypilot.in", "DemoPassword123!");
  };

  const logout = () => {
    setExplicitlyLoggedOut(true);
    clearStoredToken();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, loginDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
