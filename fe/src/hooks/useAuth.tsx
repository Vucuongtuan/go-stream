"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, LoginInput, RegisterInput } from "@/lib/types";
import { authService } from "@/services/auth.service";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  clearError: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setAccessToken, setUser, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await apiClient.refreshAccessToken();
        const currentUser = await apiClient.get<User>("/api/auth/me");
        setUser(currentUser);
      } catch {
        // A missing/expired refresh cookie means anonymous; network failures do not open a login prompt.
      } finally {
        setIsLoading(false);
      }
    };
    void restoreSession();
  }, [setUser]);

  const login = async (input: LoginInput) => {
    setIsLoading(true); setError(null);
    try {
      const response = await authService.login(input);
      setAccessToken(response.access_token);
      setUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi đăng nhập");
      throw err;
    } finally { setIsLoading(false); }
  };

  const register = async (input: RegisterInput) => {
    setIsLoading(true); setError(null);
    try { return await authService.register(input); }
    catch (err) { setError(err instanceof Error ? err.message : "Đã xảy ra lỗi đăng ký"); throw err; }
    finally { setIsLoading(false); }
  };

  const logout = () => {
    clearAuth();
    void apiClient.post("/api/auth/logout").catch(() => undefined);
  };

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, error, login, register, logout, clearError: () => setError(null) }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
