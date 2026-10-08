import React, { forwardRef } from "react";
import { cn } from "../utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[#4b5563] dark:text-[#a0a8b4]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#9ca3af] dark:text-[#6b7280]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              "w-full rounded-xl border bg-white dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC]",
              "placeholder:text-[#94A3B8] dark:placeholder:text-[#64748B]",
              "transition-all duration-200 focus:outline-none",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-[#E2E8F0] dark:border-[#1E293B] focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              disabled && "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#1E293B]/40",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#9ca3af] dark:text-[#6b7280]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
