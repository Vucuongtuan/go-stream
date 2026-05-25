"use client";

import React from "react";
import { Header } from "../Header";
import { Sidebar } from "../Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased overflow-x-hidden">
      {/* Fixed Navigation Header */}
      <Header />

      {/* Spacing flex container for Sidebar & Main Content */}
      <div className="flex flex-1 flex-row">
        {/* Collapsible Sidebar */}
        <Sidebar />

        {/* Dynamic page content scroll area */}
        <main className="flex-1 min-w-0 h-[calc(100vh-4rem)] overflow-y-auto bg-zinc-950 p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
