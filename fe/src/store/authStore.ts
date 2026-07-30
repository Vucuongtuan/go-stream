import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  coinBalance: number | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setCoinBalance: (balance: number | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  coinBalance: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setCoinBalance: (balance) => set({ coinBalance: balance }),
  clearAuth: () => set({ accessToken: null, user: null, coinBalance: null }),
}));

export default useAuthStore;
