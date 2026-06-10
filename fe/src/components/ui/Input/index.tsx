"use client";

import React, { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const inputVariants = cva(
  "block w-full rounded-xl border text-sm text-foreground shadow-sm transition-all duration-300 focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      inputVariant: {
        default: "bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 focus:border-neon-primary focus:ring-neon-primary/25 placeholder-zinc-400 dark:placeholder-zinc-650",
        filled: "bg-zinc-100 dark:bg-zinc-900/50 border-transparent focus:bg-zinc-50 dark:focus:bg-zinc-950 focus:border-neon-primary focus:ring-neon-primary/25 placeholder-zinc-400 dark:placeholder-zinc-500",
        cyberpunk: "bg-zinc-950 border-neon-yellow/40 text-neon-yellow placeholder-neon-yellow/30 focus:border-neon-yellow focus:ring-neon-yellow/20 font-mono",
      },
      inputSize: {
        sm: "px-3 py-2 text-xs rounded-lg",
        md: "px-4.5 py-2.5 text-sm",
        lg: "px-5.5 py-3.5 text-base rounded-2xl",
      }
    },
    defaultVariants: {
      inputVariant: "default",
      inputSize: "md",
    }
  }
);

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string | null;
}

export function Input({
  label,
  id,
  error,
  className = "",
  type = "text",
  inputVariant,
  inputSize,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider select-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={cn(
            inputVariants({ inputVariant, inputSize }),
            isPassword ? "pr-11" : "",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40"
              : "",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 font-bold tracking-wide">{error}</p>
      )}
    </div>
  );
}

export default Input;
