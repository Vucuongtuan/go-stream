"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthModal() {
  const { 
    isAuthModalOpen, 
    authModalTab, 
    isCloseable, 
    closeAuthModal, 
    setAuthModalTab 
  } = useAuthStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isAuthModalOpen]);

  if (!mounted) return null;

  const handleClose = () => {
    if (isCloseable) {
      sessionStorage.setItem("auth_modal_dismissed", "true");
      closeAuthModal();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with elegant dark overlay & clean blur */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isAuthModalOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal Card - Handcrafted Apple HIG Minimalist Design */}
      <div 
        className={`relative w-full max-w-[400px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)] transition-all duration-300 ${
          isAuthModalOpen 
            ? "translate-y-0 scale-100 opacity-100" 
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Close Button */}
        {isCloseable && (
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4.5 w-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Embedded Forms */}
        <div className="relative z-10">
          {authModalTab === "login" ? (
            <LoginForm 
              redirectOnSuccess={false} 
              onSuccess={closeAuthModal} 
              onSwitchToRegister={() => setAuthModalTab("register")}
            />
          ) : (
            <RegisterForm 
              redirectOnSuccess={false} 
              onSuccess={closeAuthModal} 
              onSwitchToLogin={() => setAuthModalTab("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
