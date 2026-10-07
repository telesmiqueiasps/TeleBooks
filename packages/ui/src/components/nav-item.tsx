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
        "group relative flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left select-none",
        active
          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
          : "text-[#525b6a] dark:text-[#9ca3af] hover:bg-[#f3efe7] dark:hover:bg-[#1e232d] hover:text-[#111827] dark:hover:text-[#f3f4f6]",
        collapsed && "justify-center px-2",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-transform duration-150 group-hover:scale-105",
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-[#6b7280] dark:text-[#9ca3af] group-hover:text-current"
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
              ? "bg-blue-600 text-white"
              : "bg-[#e5e0d8] dark:bg-[#272b35] text-[#4b5563] dark:text-[#9ca3af]"
          )}
        >
          {badge}
        </span>
      )}

      {/* Indicador de item ativo */}
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400" />
      )}
    </button>
  );
}
