"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Clock,
  Calendar,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { UserBook, ReadingSession } from "@telebooks/types";
import { api } from "../../lib/api";

export interface ReadingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBook: UserBook | null;
  onSuccess?: (newSession: ReadingSession) => void;
}

export function ReadingSessionModal({
  isOpen,
  onClose,
  userBook,
  onSuccess,
}: ReadingSessionModalProps) {
  const [startPage, setStartPage] = useState<number>(0);
  const [endPage, setEndPage] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [sessionDate, setSessionDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = userBook?.book?.page_count || 0;
  const initialPage = userBook?.current_page || 0;

  useEffect(() => {
    if (isOpen && userBook) {
      const current = userBook.current_page || 0;
      setStartPage(current);
      // Se não terminou o livro, sugere avançar 10 páginas ou até o fim
      const suggestedEnd = totalPages > 0 ? Math.min(current + 15, totalPages) : current + 15;
      setEndPage(suggestedEnd);
      setDurationMinutes(30);
      setNotes("");
      setError(null);

      // Data e hora local atual no formato YYYY-MM-DDTHH:mm
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSessionDate(now.toISOString().slice(0, 16));
    }
  }, [isOpen, userBook, totalPages]);

  if (!userBook) return null;

  const pagesRead = Math.max(0, endPage - startPage);
  const willFinishBook = totalPages > 0 && endPage >= totalPages;
  const progressPercent =
    totalPages > 0 ? Math.min(100, Math.round((endPage / totalPages) * 100)) : 0;

  const handleQuickAdd = (pagesToAdd: number) => {
    const next = totalPages > 0 ? Math.min(endPage + pagesToAdd, totalPages) : endPage + pagesToAdd;
    setEndPage(next);
  };

  const handleFinishBook = () => {
    if (totalPages > 0) {
      setEndPage(totalPages);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endPage < startPage) {
      setError("A página final não pode ser menor que a página inicial.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const startedAt = sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString();
      const durationSeconds = durationMinutes > 0 ? durationMinutes * 60 : undefined;

      const created = await api.createReadingSession(userBook.id, {
        start_page: startPage,
        end_page: endPage,
        started_at: startedAt,
        duration_seconds: durationSeconds,
        notes: notes.trim() || undefined,
      });

      onSuccess?.(created);
      onClose();
    } catch (err: unknown) {
      console.error("Erro ao registrar sessão de leitura:", err);
      const msg = err instanceof Error ? err.message : "Erro ao registrar sessão.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Sessão de Leitura">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner do Livro */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
          <div className="w-12 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 shadow-sm relative">
            {userBook.book?.cover_url || userBook.book?.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userBook.book?.cover_url || userBook.book?.thumbnail_url || ""}
                alt={userBook.book?.title || "Capa do livro"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate">
              {userBook.book?.title}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {userBook.book?.authors?.map((a) => a.name).join(", ") || "Autor desconhecido"}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              <span>Pág. atual: {initialPage}</span>
              {totalPages > 0 && (
                <>
                  <span className="text-neutral-400">•</span>
                  <span>Total: {totalPages} págs</span>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Páginas Lidas */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-blue" />
            Progresso de Páginas
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 mb-1.5 block">
                Página Inicial
              </span>
              <Input
                type="number"
                min={0}
                max={totalPages > 0 ? totalPages : 99999}
                value={startPage}
                onChange={(e) => setStartPage(Math.max(0, parseInt(e.target.value) || 0))}
                required
              />
            </div>
            <div>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 mb-1.5 block">
                Página Final
              </span>
              <Input
                type="number"
                min={startPage}
                max={totalPages > 0 ? totalPages : 99999}
                value={endPage}
                onChange={(e) => setEndPage(Math.max(0, parseInt(e.target.value) || 0))}
                required
              />
            </div>
          </div>

          {/* Atalhos de Páginas */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-neutral-400 mr-1">Atalhos:</span>
            <button
              type="button"
              onClick={() => handleQuickAdd(5)}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
            >
              +5 págs
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(10)}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
            >
              +10 págs
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(20)}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
            >
              +20 págs
            </button>
            {totalPages > 0 && (
              <button
                type="button"
                onClick={handleFinishBook}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors ml-auto"
              >
                Concluir Livro ✨
              </button>
            )}
          </div>

          {/* Destaque de Páginas Lidas */}
          <div className="p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Páginas lidas nesta sessão:
              </span>
            </div>
            <span className="text-sm font-bold text-brand-blue">
              {pagesRead} {pagesRead === 1 ? "página" : "páginas"}
            </span>
          </div>

          {willFinishBook && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>
                Parabéns! Ao salvar esta sessão, o livro será automaticamente marcado como{" "}
                <strong>Lido</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Duração & Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-4 h-4 text-brand-blue" />
              Tempo de Leitura (minutos)
            </label>
            <Input
              type="number"
              min={0}
              max={1440}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    durationMinutes === mins
                      ? "bg-brand-blue text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-4 h-4 text-brand-blue" />
              Data e Hora
            </label>
            <Input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Notas da Sessão */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-1.5">
            <FileText className="w-4 h-4 text-brand-blue" />
            Notas e Reflexões (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="O que aconteceu no capítulo? Citações ou pensamentos rápidos..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors resize-none"
          />
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || endPage < startPage}
            className="px-5 bg-brand-blue hover:bg-brand-blue/90"
          >
            {isSubmitting ? "Registrando..." : "Salvar Sessão"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
