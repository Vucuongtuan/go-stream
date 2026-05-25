"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, LoginInput, RegisterInput } from "@/lib/types";
import { authService } from "@/services/auth.service";
import { apiClient } from "@/lib/api-client";
import { getCookie, setCookie, deleteCookie } from "@/utils/cookie";

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedSession = getCookie("user_session");
        const token = getCookie("access_token");
        
        if (token) {
          try {
            const data = await apiClient.get<User>("/api/auth/me");
            if (data) {
              setUser(data);
              setCookie("user_session", JSON.stringify(data), 7);
              return;
            }
          } catch (err) {
            console.error("Lỗi đồng bộ session qua API:", err);
          }
        }
        
        if (savedSession) {
          setUser(JSON.parse(savedSession));
        }
      } catch {
        deleteCookie("user_session");
        deleteCookie("access_token");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(input);
      setUser(response.user);
      
      // Store credentials in cookies for 7 days
      setCookie("access_token", response.access_token, 7);
      setCookie("user_session", JSON.stringify(response.user), 7);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi đăng nhập";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const userResult = await authService.register(input);
      // Since backend register does not return a token, we return the user
      // and let the client call login next or redirect to login.
      return userResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi đăng ký tài khoản";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    deleteCookie("access_token");
    deleteCookie("user_session");
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
