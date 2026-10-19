"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Clock,
  Loader2,
  Quote,
} from "lucide-react";
import { Button, cn } from "@telebooks/ui";
import type { Rabisco, RabiscoBackground, RabiscoFontStyle } from "@telebooks/types";
import { api } from "../../lib/api";
import {
  RABISCO_THEMES,
  RABISCO_FONTS,
  getRabiscoTheme,
  getRabiscoFont,
} from "./rabisco-constants";

export interface CreateRabiscoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (rabisco: Rabisco) => void;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
}

export function CreateRabiscoModal({
  isOpen,
  onClose,
  onCreated,
  currentUserAvatar,
  currentUserName,
}: CreateRabiscoModalProps) {
  const [content, setContent] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<RabiscoBackground>("gradient-blue");
  const [selectedFont, setSelectedFont] = useState<RabiscoFontStyle>("sans");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeTheme = getRabiscoTheme(selectedTheme);
  const activeFont = getRabiscoFont(selectedFont);
  const charsLeft = 300 - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = content.trim();
    if (!clean) {
      setError("Escreva algo no seu rabisco.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const created = await api.createRabisco({
        content: clean,
        background_style: selectedTheme,
        font_style: selectedFont,
      });

      onCreated(created);
      setContent("");
      setSelectedTheme("gradient-blue");
      setSelectedFont("sans");
      onClose();
    } catch (err: unknown) {
      console.error("Erro ao criar rabisco:", err);
      setError("Não foi possível publicar seu rabisco. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Novo Rabisco
              </h2>
              <p className="text-[11px] text-slate-400">
                Uma nota efêmera visível por 24 horas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll se necessário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Card de Preview Interativo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pré-visualização
            </label>
            <div
              className={cn(
                "relative aspect-[4/3] w-full rounded-2xl p-6 flex flex-col justify-between shadow-lg overflow-hidden transition-all duration-300",
                activeTheme.bgClass
              )}
            >
              {/* Header do Autor no Card */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(currentUserName || "EU").substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight drop-shadow-xs">
                    {currentUserName || "Seu nome"}
                  </p>
                  <p className="text-[10px] opacity-80 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>24h restantes</span>
                  </p>
                </div>
              </div>

              {/* Conteúdo Central */}
              <div className="my-auto py-2 text-center relative">
                <Quote className="w-6 h-6 mx-auto mb-1 opacity-20" />
                <p
                  className={cn(
                    "text-sm sm:text-base leading-snug drop-shadow-sm max-h-[140px] overflow-hidden line-clamp-5",
                    activeFont.fontClass
                  )}
                >
                  {content.trim() || (
                    <span className="opacity-50 italic">
                      Digite seu rabisco literário abaixo...
                    </span>
                  )}
                </p>
              </div>

              {/* Rodapé do Card */}
              <div className="text-[10px] opacity-75 text-center font-mono tracking-wider">
                TELEBOOKS • RABISCOS
              </div>
            </div>
          </div>

          {/* Campo de Texto */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                O que você quer rabiscar hoje?
              </label>
              <span
                className={cn(
                  "text-[11px] font-mono",
                  charsLeft < 30
                    ? "text-rose-500 font-bold"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {charsLeft} restantes
              </span>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="Compartilhe um trecho marcante, uma ideia de leitura rápida ou um pensamento que ecoou..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF] transition-all resize-none"
              autoFocus
            />
          </div>

          {/* Seletor de Tema / Fundo */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cor do Fundo
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {RABISCO_THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      "w-8 h-8 rounded-full shrink-0 bg-gradient-to-br transition-all cursor-pointer relative",
                      theme.previewBg,
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#007BFF] scale-110 shadow-sm"
                        : "opacity-80 hover:opacity-100"
                    )}
                    title={theme.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Seletor de Tipografia */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Estilo da Fonte
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {RABISCO_FONTS.map((font) => {
                const isSelected = selectedFont === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSelectedFont(font.id)}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center truncate",
                      isSelected
                        ? "bg-[#007BFF] text-white border-[#007BFF] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    {font.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensagem de Erro (se houver) */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs px-4"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-full text-xs px-6 bg-[#007BFF] hover:bg-[#006CEB] text-white shadow-xs font-bold"
              disabled={isSubmitting || !content.trim()}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? "Publicando..." : "Publicar Rabisco"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
