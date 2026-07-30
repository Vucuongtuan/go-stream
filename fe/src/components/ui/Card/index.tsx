import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const cardVariants = cva(
  "relative overflow-hidden rounded-2xl",
  {
    variants: {
      variant: {
        default: "bg-zinc-100/70 dark:bg-zinc-900/35",
        glass: "bg-white/60 dark:bg-zinc-900/30",
        neonGlow: "bg-zinc-900/70 dark:bg-zinc-900/45",
        cyberpunk: "bg-zinc-900",
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
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  variant,
  padding,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, padding }),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
