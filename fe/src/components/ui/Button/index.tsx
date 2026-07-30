import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center rounded-xl font-bold tracking-wide transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-neon-primary text-white hover:bg-neon-primary/90 focus:ring-neon-primary",
        secondary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80 focus:ring-zinc-500",
        cyber: "bg-neon-accent/10 text-neon-accent hover:bg-neon-accent/20 focus:ring-neon-accent",
        glow: "bg-neon-primary text-white hover:bg-neon-primary/90 focus:ring-neon-primary",
        outline: "border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:ring-zinc-500",
        ghost: "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white focus:ring-zinc-500",
      },
      size: {
        sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
        md: "px-5 py-2.5 text-sm gap-2",
        lg: "px-7 py-3.5 text-base gap-2.5 rounded-2xl",
      },
      fullWidth: {
        true: "w-full flex",
        false: "w-auto",
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export function Button({
  children,
  isLoading,
  disabled,
  className,
  variant,
  size,
  fullWidth,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          {/* Circular Spinner */}
          <svg
            className="animate-spin h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Vui lòng đợi...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
