import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthResponse, UserProfile } from "../lib/api";
import {
  apiLogout,
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  login as apiLogin,
  registerUser as apiRegister,
} from "../lib/api";
import { isExplicitlyLoggedOut, setExplicitlyLoggedOut } from "./session";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    setExplicitlyLoggedOut(true);
    clearStoredToken();
    setUser(null);
    setToken(null);
    try {
      await apiLogout();
    } catch {
      // Non-fatal
    }
  }, []);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const existing = getStoredToken();

    // Check for Google OAuth success callback signal
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("auth") === "success") {
        setExplicitlyLoggedOut(false);
        if (window.history?.replaceState) {
          searchParams.delete("auth");
          const remainingQuery = searchParams.toString();
          const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + (window.location.hash || "");
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }

    if (!isExplicitlyLoggedOut()) {
      try {
        const u = await fetchCurrentUser();
        setUser(u);
        setToken(existing);
        setIsLoading(false);
        return;
      } catch {
        clearStoredToken();
        setToken(null);
      }
    }

    // Default: clean unauthenticated entry path. No automatic demo authentication.
    setUser(null);
    setToken(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initAuth();

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener("pennypilot:auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("pennypilot:auth_expired", handleAuthExpired);
    };
  }, [initAuth, logout]);

  const login = async (email: string, pass: string) => {
    const auth = await apiLogin(email, pass);
    setUser(auth.user);
    setToken(auth.access_token || null);
    setExplicitlyLoggedOut(false);
  };

  const register = async (email: string, pass: string, name: string): Promise<AuthResponse> => {
    const auth = await apiRegister({
      email,
      password: pass,
      display_name: name,
    });
    if (auth.access_token) {
      setUser(auth.user);
      setToken(auth.access_token);
      setExplicitlyLoggedOut(false);
    }
    return auth;
  };

  const updateUser = (data: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
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
