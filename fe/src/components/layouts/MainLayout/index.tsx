"use client";

import React from "react";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
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
