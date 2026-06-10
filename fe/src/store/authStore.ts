import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  
  // Auth Modal state
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register";
  isCloseable: boolean;
  openAuthModal: (tab?: "login" | "register", closeable?: boolean) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: "login" | "register") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  
  // Auth Modal initial state
  isAuthModalOpen: false,
  authModalTab: "login",
  isCloseable: true,
  openAuthModal: (tab = "login", closeable = true) => 
    set({ isAuthModalOpen: true, authModalTab: tab, isCloseable: closeable }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
}));

export default useAuthStore;
