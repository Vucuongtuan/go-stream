import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-zinc-950 text-zinc-100 antialiased overflow-hidden">
      {/* Decorative Radial Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-6 py-12 lg:px-8">
        {/* Branding Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
          >
            {/* Live Indicator Logo */}
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
              Go-Stream
            </span>
          </Link>
        </div>

        {/* Content Container */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="border border-white/5 bg-zinc-900/60 backdrop-blur-xl px-6 py-8 shadow-2xl sm:rounded-2xl sm:px-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
