"use client";

import React, { useEffect } from "react";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthModal } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const dismissed = sessionStorage.getItem("auth_modal_dismissed");
      if (dismissed !== "true") {
        // Show login modal which is closeable
        openAuthModal("login", true);
      }
    }
  }, [isAuthenticated, isLoading, openAuthModal]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 antialiased">
      {/* Fixed Navigation Header */}
      <Header />

      {/* Spacing flex container for Sidebar & Main Content */}
      <div className="flex flex-1 flex-row">
        {/* Collapsible Sidebar */}
        <Sidebar />

        {/* Dynamic page content scrolls naturally on document level */}
        <main className="flex-1 min-w-0 bg-white dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
