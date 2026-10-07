"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../utils";

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownTrigger must be used within Dropdown");

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        context.setIsOpen((prev) => !prev);
      }}
      className={cn("cursor-pointer inline-flex", className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenu({
  children,
  align = "right",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenu must be used within Dropdown");

  if (!context.isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-40 mt-1 min-w-[180px] rounded-xl border border-[#e5e0d8] dark:border-[#2b313e]",
        "bg-white dark:bg-[#181b22] p-1.5 shadow-lg",
        "animate-in fade-in zoom-in-95 duration-150 origin-top",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const context = useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onClick?.();
    context?.close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
        danger
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
          : "text-[#374151] dark:text-[#d1d5db] hover:bg-[#f5f1e9] dark:hover:bg-[#222834] hover:text-[#111827] dark:hover:text-[#f3f4f6]",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
        className
      )}
    >
      {icon && <span className="h-4 w-4 shrink-0 text-current">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "my-1 h-px bg-[#ece7dd] dark:bg-[#252a35]",
        className
      )}
    />
  );
}
