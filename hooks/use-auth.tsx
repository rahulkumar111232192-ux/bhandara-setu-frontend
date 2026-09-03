"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react";
import { apiFetch } from "@/lib/api";

interface User {
  id: number | string;
  name: string | null;
  email?: string;
  isAnonymous?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  ensureAnonymousIdentity: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate the session with the server
  const validateSession = async (): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.status === 200 && data.user) {
          setUser(data.user);
          localStorage.setItem("bhandara-user", JSON.stringify(data.user));
          return true;
        }
      }
      
      // If 401 or invalid response: session key expired or invalid
      if (res.status === 401 || res.status === 403) {
        const storedUser = localStorage.getItem("bhandara-user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (!parsed.isAnonymous) {
              console.warn("Session key expired on server. Clearing stale user state.");
              localStorage.removeItem("bhandara-user");
              localStorage.removeItem("bhandara-token");
              setUser(null);
            }
          } catch {}
        }
        return false;
      }
    } catch (error) {
      // Network error (offline mode) — don't log out
      console.warn("Network error during session validation", error);
    }
    return false;
  };

  // Initial load: load optimistic user, then validate with server
  useEffect(() => {
    const initAuth = async () => {
      const storedUserStr = localStorage.getItem("bhandara-user");
      let optimisticUser: User | null = null;
      if (storedUserStr) {
        try {
          optimisticUser = JSON.parse(storedUserStr);
          setUser(optimisticUser);
        } catch {
          localStorage.removeItem("bhandara-user");
        }
      }

      // If registered user was stored, validate that the session key hasn't expired
      if (optimisticUser && !optimisticUser.isAnonymous) {
        await validateSession();
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Listen for global session expiration events (triggered by 401 from any apiFetch)
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };
    window.addEventListener("bhandara:session-expired", handleSessionExpired);
    return () => window.removeEventListener("bhandara:session-expired", handleSessionExpired);
  }, []);

  const ensureAnonymousIdentity = async () => {
    // If user is already authenticated with a real account, do not generate anonymous identity
    if (user && !user.isAnonymous) {
      return;
    }

    const existingUser = localStorage.getItem("bhandara-user");
    if (existingUser) {
      try {
        const parsed = JSON.parse(existingUser);
        if (!parsed.isAnonymous) {
          return;
        }
      } catch {}
    }

    const existingToken = localStorage.getItem("bhandara-token");
    if (existingToken && existingUser) {
      return;
    }

    try {
      const res = await apiFetch("/api/auth/anonymous", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create anonymous identity");
      }

      const anonymousUser = { id: data.token, name: "Guest", email: "guest@anonymous", isAnonymous: true };
      localStorage.setItem("bhandara-user", JSON.stringify(anonymousUser));
      localStorage.setItem("bhandara-token", data.token);
      setUser(anonymousUser);
    } catch {}
  };

  const login = async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    const loggedInUser = data.user;
    const token = data.token;
    setUser(loggedInUser);
    localStorage.setItem("bhandara-user", JSON.stringify(loggedInUser));
    if (token) {
      localStorage.setItem("bhandara-token", token);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Signup failed");
    }

    const newUser = data.user;
    const token = data.token;
    setUser(newUser);
    localStorage.setItem("bhandara-user", JSON.stringify(newUser));
    if (token) {
      localStorage.setItem("bhandara-token", token);
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    localStorage.removeItem("bhandara-user");
    localStorage.removeItem("bhandara-token");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, ensureAnonymousIdentity, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
