"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Library, BookmarkCheck, FolderHeart, BarChart3 } from "lucide-react";
import { cn } from "@telebooks/ui";

export interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  readingCount?: number;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  readingCount = 2,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "library", label: "Biblioteca", icon: Library },
    {
      id: "reading",
      label: "Lendo",
      icon: BookmarkCheck,
      badge: readingCount,
    },
    { id: "collections", label: "Coleções", icon: FolderHeart },
    { id: "stats", label: "Métricas", icon: BarChart3 },
  ];

  const effectiveTab = pathname.startsWith("/minha-biblioteca")
    ? (pathname.includes("groupBy=collection") ? "collections" : "library")
    : pathname.startsWith("/leitura-atual")
    ? "reading"
    : pathname.startsWith("/dashboard")
    ? "stats"
    : pathname === "/"
    ? "home"
    : currentTab;

  const activeIndex = tabs.findIndex((t) => t.id === effectiveTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeTabObj = tabs[safeIndex];
  const ActiveIcon = activeTabObj?.icon || Home;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Barra de navegação arredondada com sombra fluida */}
      <div className="relative mx-3 mb-1.5 rounded-[28px] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.35)]">
        {/* Indicador Flutuante com Recorte Arredondado (Curved Notch) */}
        <div
          className="absolute top-0 h-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none flex justify-center z-20"
          style={{
            left: `${safeIndex * 20}%`,
            width: "20%",
          }}
        >
          {/* Botão circular elevado com orelhas curvas suaves */}
          <div className="relative -top-3.5 flex items-center justify-center">
            {/* Orelha curva esquerda (inverted border-radius) */}
            <span
              className="absolute -left-[14px] top-[14px] w-3.5 h-3.5 bg-transparent rounded-tr-[14px] pointer-events-none transition-colors duration-200 shadow-[4px_-4px_0_0_#ffffff] dark:shadow-[4px_-4px_0_0_#0F172A]"
              aria-hidden="true"
            />

            {/* Círculo flutuante ativo */}
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-[0_8px_20px_-3px_rgba(0,123,255,0.45)] border-[3px] border-white dark:border-[#0F172A] transform transition-transform duration-200 active:scale-95">
              <ActiveIcon className="w-5 h-5 stroke-[2.4]" />
              {activeTabObj?.badge && activeTabObj.badge > 0 ? (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0F172A]">
                  {activeTabObj.badge}
                </span>
              ) : null}
            </div>

            {/* Orelha curva direita (inverted border-radius) */}
            <span
              className="absolute -right-[14px] top-[14px] w-3.5 h-3.5 bg-transparent rounded-tl-[14px] pointer-events-none transition-colors duration-200 shadow-[-4px_-4px_0_0_#ffffff] dark:shadow-[-4px_-4px_0_0_#0F172A]"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Itens da barra de navegação */}
        <div className="relative z-10 flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = safeIndex === idx;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onSelectTab(tab.id);
                  if (tab.id === "home" && pathname !== "/") {
                    router.push("/");
                  } else if (tab.id === "library" && !pathname.startsWith("/minha-biblioteca")) {
                    router.push("/minha-biblioteca");
                  } else if (tab.id === "reading" && !pathname.startsWith("/leitura-atual")) {
                    router.push("/leitura-atual");
                  } else if (tab.id === "collections") {
                    router.push("/minha-biblioteca?groupBy=collection");
                  } else if (tab.id === "stats" && !pathname.startsWith("/dashboard")) {
                    router.push("/dashboard");
                  }
                }}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center h-full min-h-[48px] transition-all duration-200 select-none group active:scale-95",
                  isActive
                    ? "opacity-100"
                    : "opacity-75 hover:opacity-100 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
                aria-label={tab.label}
              >
                {/* Ícone inativo (oculto quando ativo, pois sobe para o círculo flutuante) */}
                <div
                  className={cn(
                    "transition-all duration-200",
                    isActive
                      ? "opacity-0 -translate-y-2 pointer-events-none h-0"
                      : "opacity-100 translate-y-0 h-5"
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute top-2 right-1/2 translate-x-3.5 h-3.5 min-w-[14px] px-1 rounded-full bg-[#007BFF] text-white text-[9px] font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>

                {/* Rótulo de texto com transição suave */}
                <span
                  className={cn(
                    "text-[10px] tracking-tight leading-none transition-all duration-200",
                    isActive
                      ? "font-bold text-[#007BFF] dark:text-[#38BDF8] translate-y-3"
                      : "font-medium text-slate-500 dark:text-slate-400 mt-1"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
