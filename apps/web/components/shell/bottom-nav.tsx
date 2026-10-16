"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Library, Plus, Users, User } from "lucide-react";
import { cn } from "@telebooks/ui";

export interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  readingCount?: number;
  onAddBookClick?: () => void;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  readingCount,
  onAddBookClick,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isHomeActive = pathname === "/" && (currentTab === "home" || !currentTab);
  const isLibraryActive =
    pathname.startsWith("/minha-biblioteca") || currentTab === "library";
  const isCommunityActive =
    pathname.startsWith("/comunidade") || currentTab === "community";
  const isProfileActive =
    pathname.startsWith("/perfil") || currentTab === "profile";

  const handleCenterPlusClick = () => {
    if (onAddBookClick) {
      onAddBookClick();
    } else {
      router.push("/minha-biblioteca?action=search");
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Barra de navegação arredondada com sombra fluida */}
      <div className="relative mx-3 mb-1.5 rounded-[28px] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {/* 1. Início */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("home");
              if (pathname !== "/") router.push("/");
            }}
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-[48px] transition-all duration-200 select-none group active:scale-95",
              isHomeActive
                ? "text-[#007BFF] dark:text-[#38BDF8]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
            aria-label="Início"
          >
            <Home className={cn("w-5 h-5", isHomeActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span
              className={cn(
                "text-[10px] tracking-tight leading-none mt-1",
                isHomeActive ? "font-bold text-[#007BFF] dark:text-[#38BDF8]" : "font-medium"
              )}
            >
              Início
            </span>
            {isHomeActive && (
              <span className="w-1 h-1 rounded-full bg-[#007BFF] dark:bg-[#38BDF8] mt-0.5" />
            )}
          </button>

          {/* 2. Biblioteca */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("library");
              if (!pathname.startsWith("/minha-biblioteca")) {
                router.push("/minha-biblioteca");
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-[48px] transition-all duration-200 select-none group active:scale-95",
              isLibraryActive
                ? "text-[#007BFF] dark:text-[#38BDF8]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
            aria-label="Biblioteca"
          >
            <Library className={cn("w-5 h-5", isLibraryActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span
              className={cn(
                "text-[10px] tracking-tight leading-none mt-1",
                isLibraryActive ? "font-bold text-[#007BFF] dark:text-[#38BDF8]" : "font-medium"
              )}
            >
              Biblioteca
            </span>
            {isLibraryActive && (
              <span className="w-1 h-1 rounded-full bg-[#007BFF] dark:bg-[#38BDF8] mt-0.5" />
            )}
          </button>

          {/* 3. Botão + no centro (um pouco maior que os demais e fixo em azul para busca online) */}
          <div className="flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={handleCenterPlusClick}
              className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-tr from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white flex items-center justify-center shadow-[0_8px_20px_-2px_rgba(0,123,255,0.55)] border-[3.5px] border-white dark:border-[#0F172A] transform transition-transform duration-200 active:scale-90 hover:scale-105 cursor-pointer focus:outline-none"
              aria-label="Buscar online e cadastrar livros"
              title="Buscar Online (Cadastrar Livro)"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="text-[9px] font-semibold text-[#007BFF] dark:text-[#38BDF8] -mt-1.5 leading-none">
              Buscar
            </span>
          </div>

          {/* 4. Comunidade */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("community");
              if (!pathname.startsWith("/comunidade")) {
                router.push("/comunidade");
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-[48px] transition-all duration-200 select-none group active:scale-95",
              isCommunityActive
                ? "text-[#007BFF] dark:text-[#38BDF8]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
            aria-label="Comunidade"
          >
            <Users className={cn("w-5 h-5", isCommunityActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span
              className={cn(
                "text-[10px] tracking-tight leading-none mt-1",
                isCommunityActive ? "font-bold text-[#007BFF] dark:text-[#38BDF8]" : "font-medium"
              )}
            >
              Comunidade
            </span>
            {isCommunityActive && (
              <span className="w-1 h-1 rounded-full bg-[#007BFF] dark:bg-[#38BDF8] mt-0.5" />
            )}
          </button>

          {/* 5. Perfil */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("profile");
              if (!pathname.startsWith("/perfil")) {
                router.push("/perfil");
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-[48px] transition-all duration-200 select-none group active:scale-95",
              isProfileActive
                ? "text-[#007BFF] dark:text-[#38BDF8]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
            aria-label="Perfil"
          >
            <User className={cn("w-5 h-5", isProfileActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span
              className={cn(
                "text-[10px] tracking-tight leading-none mt-1",
                isProfileActive ? "font-bold text-[#007BFF] dark:text-[#38BDF8]" : "font-medium"
              )}
            >
              Perfil
            </span>
            {isProfileActive && (
              <span className="w-1 h-1 rounded-full bg-[#007BFF] dark:bg-[#38BDF8] mt-0.5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
