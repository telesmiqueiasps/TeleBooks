"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "w-full rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#181b22] text-[#161719] dark:text-[#f0f2f5]",
          "border-t sm:border border-[#e5e0d8] dark:border-[#2b313e] shadow-2xl overflow-hidden",
          "transform transition-all max-h-[90vh] flex flex-col",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-[#eeeae2] dark:border-[#252a35]">
            <div className="space-y-1 pr-6">
              {title && (
                <h2 className="font-serif text-xl font-semibold text-[#141618] dark:text-[#f3f4f6]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#9ca3af] hover:text-[#111827] dark:hover:text-[#f3f4f6] hover:bg-[#f3f0e8] dark:hover:bg-[#202530] transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-[#eeeae2] dark:border-[#252a35] bg-[#faf8f5] dark:bg-[#15171d]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
