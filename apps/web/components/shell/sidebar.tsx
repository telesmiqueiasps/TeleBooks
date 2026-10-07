"use client";

import React from "react";
import {
  BookOpen,
  BookmarkCheck,
  FolderHeart,
  BarChart3,
  Home,
  Sun,
  Moon,
  Library,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import {
  NavItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@telebooks/ui";
import { useTheme } from "../theme-provider";

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  bookCount?: number;
  readingCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  bookCount = 128,
  readingCount = 2,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[#e7e3da] dark:border-[#272b35] bg-[#faf8f5] dark:bg-[#111317] h-screen sticky top-0 p-4 justify-between select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-tight text-[#141618] dark:text-[#f3f4f6] block leading-none">
              TeleBooks
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#9ca3af] tracking-wide uppercase font-medium">
              Biblioteca Pessoal
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          <NavItem
            label="Início"
            icon={<Home className="h-4 w-4" />}
            active={currentTab === "home"}
            onClick={() => onSelectTab("home")}
          />
          <NavItem
            label="Minha Biblioteca"
            icon={<Library className="h-4 w-4" />}
            active={currentTab === "library"}
            badge={bookCount}
            onClick={() => onSelectTab("library")}
          />
          <NavItem
            label="Lendo Agora"
            icon={<BookmarkCheck className="h-4 w-4" />}
            active={currentTab === "reading"}
            badge={readingCount}
            onClick={() => onSelectTab("reading")}
          />
          <NavItem
            label="Coleções & Tags"
            icon={<FolderHeart className="h-4 w-4" />}
            active={currentTab === "collections"}
            onClick={() => onSelectTab("collections")}
          />
          <NavItem
            label="Estatísticas"
            icon={<BarChart3 className="h-4 w-4" />}
            active={currentTab === "stats"}
            onClick={() => onSelectTab("stats")}
          />
        </nav>
      </div>

      {/* Footer / Profile & Theme */}
      <div className="space-y-3 pt-4 border-t border-[#e7e3da] dark:border-[#272b35]">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-[#525b6a] dark:text-[#9ca3af] hover:bg-[#efebe2] dark:hover:bg-[#1a1e26] transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-blue-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
            <span>Tema {theme === "dark" ? "Escuro" : "Claro"}</span>
          </span>
          <span className="text-[10px] uppercase font-semibold text-[#8c94a0]">
            Alternar
          </span>
        </button>

        {/* User Capsule */}
        <Dropdown>
          <DropdownTrigger className="w-full">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#efebe2] dark:hover:bg-[#1a1e26] transition-colors w-full text-left">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-sm">
                MT
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#141618] dark:text-[#f3f4f6] truncate">
                  Miqueias Teles
                </p>
                <p className="text-[11px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                  @telesmiqueiasps
                </p>
              </div>
            </div>
          </DropdownTrigger>
          <DropdownMenu align="left" className="bottom-full mb-2 w-56">
            <DropdownItem icon={<User className="h-4 w-4" />}>
              Meu Perfil
            </DropdownItem>
            <DropdownItem icon={<Settings className="h-4 w-4" />}>
              Configurações
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger icon={<LogOut className="h-4 w-4" />}>
              Encerrar Sessão
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </aside>
  );
}
