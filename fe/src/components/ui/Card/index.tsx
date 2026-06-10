import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const cardVariants = cva(
  "rounded-2xl border transition-all duration-300 relative overflow-hidden backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-white/80 dark:bg-zinc-950/40 border-zinc-250/60 dark:border-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-800",
        glass: "bg-white/50 dark:bg-zinc-950/30 border-white/20 dark:border-white/5 shadow-xl shadow-black/5 hover:border-neon-primary/20 dark:hover:border-neon-primary/10 hover:shadow-neon-primary/5",
        neonGlow: "bg-zinc-950/80 dark:bg-zinc-950/40 border-zinc-850 dark:border-zinc-900 hover:border-neon-primary/35 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.08)]",
        cyberpunk: "bg-zinc-950 border-neon-yellow/30 hover:border-neon-yellow hover:shadow-[0_0_15px_rgba(250,204,21,0.1)]",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-5",
        lg: "p-7",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverEffect?: boolean;
}

export function Card({
  className,
  variant,
  padding,
  hoverEffect = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, padding }),
        hoverEffect ? "hover:-translate-y-0.5" : "",
        className
      )}
      {...props}
    >
      {/* Subtle top light reflection for premium look */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

export default Card;
