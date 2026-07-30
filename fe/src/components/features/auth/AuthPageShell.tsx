import Link from "next/link";
import { Apple, Mail } from "lucide-react";

interface AuthPageShellProps {
  children: React.ReactNode;
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="grid h-dvh grid-rows-[1fr_auto_1fr] overflow-hidden bg-white px-6 dark:bg-zinc-950">
      <div className="flex items-end justify-center pb-10">
        <Link href="/" className="text-base font-semibold text-zinc-900 dark:text-white">
          VTC
        </Link>
      </div>
      <section className="w-full max-w-sm self-center justify-self-center">
        {children}
      </section>
      <div className="w-full max-w-sm self-start justify-self-center pt-8">
        <p className="mb-4 text-center text-xs text-zinc-400 dark:text-zinc-500">Hoặc tiếp tục với</p>
        <div className="grid grid-cols-3 gap-3">
          <button type="button" disabled aria-label="Đăng nhập bằng Google (chưa khả dụng)" className="flex h-11 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 opacity-60 dark:bg-zinc-900 dark:text-zinc-400">
            <GoogleIcon />
          </button>
          <button type="button" disabled aria-label="Đăng nhập bằng Apple (chưa khả dụng)" className="flex h-11 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 opacity-60 dark:bg-zinc-900 dark:text-zinc-400">
            <Apple className="h-4 w-4" />
          </button>
          <button type="button" disabled aria-label="Đăng nhập bằng email OTP (chưa khả dụng)" className="flex h-11 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 opacity-60 dark:bg-zinc-900 dark:text-zinc-400">
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" />
      <path fill="#34A853" d="M12 22c2.8 0 5.1-.9 6.8-2.4l-3.2-2.5c-.9.6-2 .9-3.6.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.2 13.7a6 6 0 0 1 0-3.4V7.7H2.9a10 10 0 0 0 0 8.6l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.7 0 3.2.6 4.4 1.7l3.3-3.2C17.1 2.1 14.8 1 12 1a10 10 0 0 0-9.1 5.7l3.3 2.6C7 7.8 9.3 6 12 6Z" />
    </svg>
  );
}
