"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Quote,
  Loader2,
} from "lucide-react";
import { cn } from "@telebooks/ui";
import type { RabiscoUserGroup, Rabisco } from "@telebooks/types";
import { api } from "../../lib/api";
import { getRabiscoTheme, getRabiscoFont } from "./rabisco-constants";

export interface RabiscoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: RabiscoUserGroup[];
  initialGroupIndex?: number;
  currentUserId?: string | null;
  onRabiscoDeleted?: (rabiscoId: string) => void;
  onRabiscoViewed?: (rabiscoId: string, groupId: string) => void;
}

const STORY_DURATION_MS = 7000;

export function RabiscoViewerModal({
  isOpen,
  onClose,
  groups,
  initialGroupIndex = 0,
  currentUserId,
  onRabiscoDeleted,
  onRabiscoViewed,
}: RabiscoViewerModalProps) {
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentRabiscoIdx, setCurrentRabiscoIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(STORY_DURATION_MS);

  // Sincroniza índice inicial quando abre
  useEffect(() => {
    if (isOpen) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentRabiscoIdx(0);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION_MS;
    }
  }, [isOpen, initialGroupIndex]);

  const currentGroup = groups[currentGroupIdx];
  const activeRabiscos = currentGroup?.rabiscos || [];
  const activeRabisco = activeRabiscos[currentRabiscoIdx] as Rabisco | undefined;

  // Registrar visualização quando muda de rabisco
  useEffect(() => {
    if (!isOpen || !activeRabisco) return;

    if (!activeRabisco.has_viewed && currentUserId && activeRabisco.user_id !== currentUserId) {
      api.viewRabisco(activeRabisco.id).catch(() => {});
      if (onRabiscoViewed && currentGroup) {
        onRabiscoViewed(activeRabisco.id, currentGroup.user_id);
      }
    }
  }, [isOpen, activeRabisco, currentUserId, currentGroup, onRabiscoViewed]);

  // Avançar para próximo rabisco ou próximo usuário
  const handleNext = useCallback(() => {
    if (currentRabiscoIdx < activeRabiscos.length - 1) {
      setCurrentRabiscoIdx((prev) => prev + 1);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION_MS;
    } else if (currentGroupIdx < groups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentRabiscoIdx(0);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION_MS;
    } else {
      onClose();
    }
  }, [currentRabiscoIdx, activeRabiscos.length, currentGroupIdx, groups.length, onClose]);

  // Voltar para rabisco anterior ou grupo anterior
  const handlePrev = useCallback(() => {
    if (currentRabiscoIdx > 0) {
      setCurrentRabiscoIdx((prev) => prev - 1);
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION_MS;
    } else if (currentGroupIdx > 0) {
      const prevGroup = groups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentRabiscoIdx(Math.max(0, (prevGroup?.rabiscos?.length || 1) - 1));
      setProgress(0);
      remainingTimeRef.current = STORY_DURATION_MS;
    }
  }, [currentRabiscoIdx, currentGroupIdx, groups]);

  // Timer de progresso automático
  useEffect(() => {
    if (!isOpen || !activeRabisco || isPaused) return;

    startTimeRef.current = Date.now();
    const duration = remainingTimeRef.current;

    const intervalStep = 50; // Atualiza a cada 50ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const initialProgress = ((STORY_DURATION_MS - duration) / STORY_DURATION_MS) * 100;
      const currentAddedProgress = (elapsed / STORY_DURATION_MS) * 100;
      const totalProgress = Math.min(100, initialProgress + currentAddedProgress);
      setProgress(totalProgress);
    }, intervalStep);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, activeRabisco, isPaused, handleNext]);

  // Pausar / Continuar
  const handleHoldStart = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleHoldEnd = () => {
    setIsPaused(false);
  };

  // Teclado (ESC, Setas)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Deletar Rabisco
  const handleDeleteActiveRabisco = async () => {
    if (!activeRabisco) return;
    if (!confirm("Excluir este rabisco?")) return;

    try {
      setIsDeleting(true);
      await api.deleteRabisco(activeRabisco.id);

      if (onRabiscoDeleted) {
        onRabiscoDeleted(activeRabisco.id);
      }

      // Se só tinha este rabisco, avança ou fecha
      if (activeRabiscos.length <= 1) {
        if (groups.length <= 1) {
          onClose();
        } else {
          handleNext();
        }
      } else {
        handleNext();
      }
    } catch (err) {
      console.error("Erro ao deletar rabisco:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !currentGroup || !activeRabisco) return null;

  const isOwner = currentUserId && activeRabisco.user_id === currentUserId;
  const theme = getRabiscoTheme(activeRabisco.background_style);
  const font = getRabiscoFont(activeRabisco.font_style);

  // Formatar tempo relativo amigável
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMin = Math.floor((now.getTime() - past.getTime()) / 60000);
      if (diffMin < 1) return "agora";
      if (diffMin < 60) return `${diffMin}m`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH}h`;
      return "24h";
    } catch {
      return "recente";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:backdrop-blur-md select-none animate-in fade-in duration-150"
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
    >
      {/* Botões de Navegação Desktop */}
      {currentGroupIdx > 0 || currentRabiscoIdx > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="hidden sm:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md items-center justify-center transition-all cursor-pointer shadow-md"
          title="Anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      ) : null}

      {currentGroupIdx < groups.length - 1 || currentRabiscoIdx < activeRabiscos.length - 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="hidden sm:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md items-center justify-center transition-all cursor-pointer shadow-md"
          title="Próximo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      ) : null}

      {/* Cartão Central Estilo Story */}
      <div
        className={cn(
          "relative w-full h-full sm:h-[85vh] sm:max-h-[720px] sm:max-w-md sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-5 sm:p-6 transition-all duration-300",
          theme.bgClass
        )}
      >
        {/* =====================================================================
            1. TOPO: Barras de Progresso Segmentadas
            ===================================================================== */}
        <div className="flex items-center gap-1.5 z-20 pt-1">
          {activeRabiscos.map((rab, idx) => {
            let widthPercent = 0;
            if (idx < currentRabiscoIdx) widthPercent = 100;
            else if (idx === currentRabiscoIdx) widthPercent = progress;
            else widthPercent = 0;

            return (
              <div
                key={rab.id}
                className="flex-1 h-1 sm:h-1.5 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* =====================================================================
            2. CABEÇALHO: Autor, Tempo, Contadores e Botão Fechar
            ===================================================================== */}
        <div className="flex items-center justify-between z-20 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full ring-2 ring-white/60 bg-white/20 backdrop-blur-md overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
              {currentGroup.avatar_url ? (
                <img
                  src={currentGroup.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(currentGroup.username || "L").substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold leading-tight text-white drop-shadow-xs">
                {currentGroup.full_name || currentGroup.username}
              </p>
              <p className="text-[10px] text-white/80 font-mono flex items-center gap-1.5">
                <span>@{currentGroup.username}</span>
                <span>•</span>
                <span>{formatTimeAgo(activeRabisco.created_at)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Visualizações (para o próprio autor) */}
            {isOwner && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-[11px] font-bold shadow-xs"
                title={`${activeRabisco.views_count} visualizações`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{activeRabisco.views_count}</span>
              </div>
            )}

            {/* Excluir (apenas para o autor) */}
            {isOwner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteActiveRabisco();
                }}
                disabled={isDeleting}
                className="p-1.5 rounded-full bg-black/25 hover:bg-rose-600/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                title="Excluir este rabisco"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Fechar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-full bg-black/25 hover:bg-black/50 text-white backdrop-blur-md transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            3. CENTRO: Texto do Rabisco com Tipografia e Efeito
            ===================================================================== */}
        <div className="relative my-auto py-8 px-4 sm:px-6 text-center z-10 flex flex-col items-center justify-center">
          <Quote className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-25 drop-shadow-sm" />
          <p
            className={cn(
              "text-lg sm:text-2xl leading-relaxed drop-shadow-md break-words max-w-full font-medium select-text",
              font.fontClass
            )}
          >
            {activeRabisco.content}
          </p>
        </div>

        {/* =====================================================================
            4. RODAPÉ: Indicador TeleBooks Rabiscos
            ===================================================================== */}
        <div className="text-[10px] opacity-70 text-center font-mono tracking-widest z-20 pb-2">
          TELEBOOKS • RABISCO EFÊMERO
        </div>

        {/* =====================================================================
            5. ÁREAS DE TOQUE / CLIQUE INVISÍVEIS PARA NAVEGAÇÃO
            ===================================================================== */}
        <div className="absolute inset-0 z-0 flex">
          {/* Lado Esquerdo (35%) -> Volta */}
          <div
            className="w-[35%] h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          {/* Lado Direito (65%) -> Avança */}
          <div
            className="w-[65%] h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>
      </div>
    </div>
  );
}
