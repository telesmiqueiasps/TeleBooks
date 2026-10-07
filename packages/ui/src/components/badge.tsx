import React from "react";
import { cn } from "../utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "want_to_read"
  | "reading"
  | "read"
  | "paused"
  | "abandoned";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default:
      "bg-[#f0ece4] dark:bg-[#252a35] text-[#374151] dark:text-[#d1d5db] border-transparent",
    primary:
      "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
    secondary:
      "bg-[#f7f5f0] dark:bg-[#1f232c] text-[#4b5563] dark:text-[#9ca3af] border-[#e5e0d8] dark:border-[#2f3542]",
    outline:
      "bg-transparent text-[#374151] dark:text-[#d1d5db] border-[#d8d2c6] dark:border-[#383e4d]",
    success:
      "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
    warning:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
    info:
      "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",

    // Estados de Leitura Específicos do TeleBooks
    want_to_read:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50",
    reading:
      "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/50",
    read:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50",
    paused:
      "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/50",
    abandoned:
      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };

  const dotColors: Partial<Record<BadgeVariant, string>> = {
    want_to_read: "bg-amber-500",
    reading: "bg-blue-500 animate-pulse",
    read: "bg-emerald-500",
    paused: "bg-purple-500",
    abandoned: "bg-gray-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    primary: "bg-blue-500",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border transition-colors select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotColors[variant] || "bg-current"
          )}
        />
      )}
      {children}
    </span>
  );
}
