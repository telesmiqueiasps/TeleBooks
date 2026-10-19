"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton, cn } from "@telebooks/ui";
import type { RabiscoUserGroup, Rabisco } from "@telebooks/types";
import { api } from "../../lib/api";
import { CreateRabiscoModal } from "./create-rabisco-modal";
import { RabiscoViewerModal } from "./rabisco-viewer-modal";

export interface RabiscosBarProps {
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
}

export function RabiscosBar({
  currentUserId,
  currentUserAvatar,
  currentUserName,
}: RabiscosBarProps) {
  const [groups, setGroups] = useState<RabiscoUserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Carregar feed de rabiscos
  const loadRabiscos = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getRabiscosFeed();
      setGroups(data || []);
    } catch {
      // Falha silenciosa
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRabiscos();
  }, [loadRabiscos]);

  // Verificar rolagem
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, groups]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const offset = direction === "left" ? -240 : 240;
    el.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  // Callback de novo rabisco criado
  const handleRabiscoCreated = (_newRabisco: Rabisco) => {
    loadRabiscos();
  };

  // Callback de exclusão
  const handleRabiscoDeleted = () => {
    loadRabiscos();
  };

  // Callback de visualização (atualiza ring para visualizado localmente)
  const handleRabiscoViewed = (rabiscoId: string, groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.user_id === groupId) {
          const updatedRabiscos = g.rabiscos.map((r) =>
            r.id === rabiscoId ? { ...r, has_viewed: true } : r
          );
          const hasUnseen = updatedRabiscos.some((r) => !r.has_viewed);
          return {
            ...g,
            has_unseen: hasUnseen,
            rabiscos: updatedRabiscos,
          };
        }
        return g;
      })
    );
  };

  // Verifica se o usuário atual tem rabiscos ativos no feed
  const ownGroup = groups.find((g) => g.user_id === currentUserId);
  const otherGroups = groups.filter((g) => g.user_id !== currentUserId);

  // Iniciais do usuário logado
  const initials = (currentUserName || "EU").substring(0, 2).toUpperCase();

  // Abrir story do próprio usuário
  const handleOpenOwnStory = () => {
    if (ownGroup && ownGroup.rabiscos.length > 0) {
      const ownIdx = groups.findIndex((g) => g.user_id === currentUserId);
      setSelectedGroupIdx(ownIdx >= 0 ? ownIdx : 0);
      setIsViewerOpen(true);
    } else {
      setIsCreateOpen(true);
    }
  };

  // Abrir story de outro usuário
  const handleOpenUserStory = (userId: string) => {
    const targetIdx = groups.findIndex((g) => g.user_id === userId);
    if (targetIdx >= 0) {
      setSelectedGroupIdx(targetIdx);
      setIsViewerOpen(true);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs p-3 sm:p-4">
      {/* Botão de Rolagem Esquerda (Desktop) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 items-center justify-center hover:bg-slate-50 transition-all cursor-pointer"
          title="Rolar para esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Botão de Rolagem Direita (Desktop) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 items-center justify-center hover:bg-slate-50 transition-all cursor-pointer"
          title="Rolar para direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Container de Rolagem Horizontal */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth"
      >
        {/* ===================================================================
            1. Círculo do Usuário Atual (Seu Rabisco / + Adicionar)
            =================================================================== */}
        <div className="flex flex-col items-center gap-1 shrink-0 select-none">
          <div className="relative group">
            <button
              type="button"
              onClick={handleOpenOwnStory}
              className={cn(
                "p-0.5 rounded-full transition-all cursor-pointer block active:scale-95",
                ownGroup && ownGroup.rabiscos.length > 0
                  ? "bg-gradient-to-tr from-[#006CEB] via-[#007BFF] to-sky-400 p-[2.5px]"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-blue-300"
              )}
              title={
                ownGroup && ownGroup.rabiscos.length > 0
                  ? "Ver seus rabiscos ativos"
                  : "Criar novo rabisco"
              }
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#0F172A] overflow-hidden flex items-center justify-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </button>

            {/* Ícone de Adicionar (+) no canto do avatar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateOpen(true);
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#007BFF] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0F172A] hover:bg-[#006CEB] transition-colors cursor-pointer"
              title="Publicar novo rabisco"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[72px] text-center leading-tight">
            {ownGroup && ownGroup.rabiscos.length > 0 ? "Seu Rabisco" : "Novo Rabisco"}
          </span>
        </div>

        {/* Separador vertical sutil */}
        <div className="w-[1px] h-12 bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

        {/* ===================================================================
            2. Círculos de Rabiscos de Outros Usuários
            =================================================================== */}
        {isLoading ? (
          /* Skeletons enquanto carrega */
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-full" />
              <Skeleton className="h-2.5 w-12 rounded-md" />
            </div>
          ))
        ) : otherGroups.length === 0 ? (
          /* Mensagem amigável de incentivo se não houver outros rabiscos */
          <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
            <span>Rabiscos de 24h dos leitores que você segue aparecerão aqui.</span>
          </div>
        ) : (
          otherGroups.map((group) => {
            const hasUnseen = group.has_unseen;
            const displayName = group.full_name?.split(" ")[0] || group.username;

            return (
              <button
                key={group.user_id}
                type="button"
                onClick={() => handleOpenUserStory(group.user_id)}
                className="flex flex-col items-center gap-1 shrink-0 select-none group cursor-pointer active:scale-95 transition-transform"
                title={`${group.full_name || group.username} (@${group.username})`}
              >
                {/* Story Ring com Avatar */}
                <div
                  className={cn(
                    "p-[2.5px] rounded-full transition-all duration-200",
                    hasUnseen
                      ? "bg-gradient-to-tr from-[#006CEB] via-[#007BFF] to-pink-500 shadow-xs group-hover:scale-105"
                      : "bg-slate-200 dark:bg-slate-700 opacity-75 group-hover:opacity-100"
                  )}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#0F172A] overflow-hidden flex items-center justify-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                    {group.avatar_url ? (
                      <img
                        src={group.avatar_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <span>{(group.username || "L").substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                {/* Nome do Autor */}
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70px] text-center leading-tight">
                  {displayName}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Modal de Criação de Rabisco */}
      <CreateRabiscoModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleRabiscoCreated}
        currentUserAvatar={currentUserAvatar}
        currentUserName={currentUserName}
      />

      {/* Modal de Visualização de Rabiscos (Story Viewer) */}
      <RabiscoViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        groups={groups}
        initialGroupIndex={selectedGroupIdx}
        currentUserId={currentUserId}
        onRabiscoDeleted={handleRabiscoDeleted}
        onRabiscoViewed={handleRabiscoViewed}
      />
    </section>
  );
}
