import React from "react";
import { cn } from "../utils";

export interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
  className?: string;
  collapsed?: boolean;
}

export function NavItem({
  label,
  icon,
  active = false,
  badge,
  onClick,
  className,
  collapsed = false,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 w-full rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 text-left select-none",
        active
          ? "bg-gradient-to-r from-[#006CEB] to-[#007BFF] text-white font-semibold shadow-md shadow-[#007BFF]/25"
          : "text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]",
        collapsed && "justify-center px-2.5",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-transform duration-150 group-hover:scale-105",
          active
            ? "text-white"
            : "text-[#64748B] dark:text-[#94A3B8] group-hover:text-current"
        )}
      >
        {icon}
      </span>

      {!collapsed && <span className="flex-1 truncate">{label}</span>}

      {!collapsed && badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
            active
              ? "bg-white/20 text-white"
              : "bg-[#e2e8f0] dark:bg-[#1E293B] text-[#475569] dark:text-[#94a3b8]"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
