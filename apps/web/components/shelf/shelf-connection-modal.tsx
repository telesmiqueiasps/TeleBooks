"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  Heart,
  Bookmark,
  Check,
  Trash2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Book, BookStatus, UserBook } from "@telebooks/types";
import { api } from "../../lib/api";

export interface ShelfConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  existingUserBook?: UserBook | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: BookStatus; label: string; color: string }[] = [
  { value: "want_to_read", label: "Quero Ler", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { value: "reading", label: "Lendo", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { value: "read", label: "Lido", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { value: "paused", label: "Pausado", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  { value: "abandoned", label: "Abandonado", color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30" },
];

export function ShelfConnectionModal({
  isOpen,
  onClose,
  book,
  existingUserBook,
  onSuccess,
}: ShelfConnectionModalProps) {
  const [status, setStatus] = useState<BookStatus>("want_to_read");
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rating, setRating] = useState<number>(0);
  const [favorite, setFavorite] = useState<boolean>(false);
  const [owned, setOwned] = useState<boolean>(true);
  const [privateNotes, setPrivateNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = book?.page_count || 1;

  useEffect(() => {
    if (isOpen) {
      if (existingUserBook) {
        setStatus(existingUserBook.status);
        setCurrentPage(existingUserBook.current_page || 0);
        setRating(existingUserBook.rating ? Number(existingUserBook.rating) : 0);
        setFavorite(existingUserBook.favorite);
        setOwned(existingUserBook.owned);
        setPrivateNotes(existingUserBook.private_notes || "");
      } else {
        setStatus("want_to_read");
        setCurrentPage(0);
        setRating(0);
        setFavorite(false);
        setOwned(true);
        setPrivateNotes("");
      }
      setError(null);
    }
  }, [isOpen, existingUserBook]);

  if (!book) return null;

  const progressPercent = Math.min(
    100,
    Math.round((currentPage / (totalPages || 1)) * 100)
  );

  const handleStatusChange = (newStatus: BookStatus) => {
    setStatus(newStatus);
    if (newStatus === "read") {
      setCurrentPage(totalPages);
    } else if (newStatus === "want_to_read" && currentPage === totalPages) {
      setCurrentPage(0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (existingUserBook) {
        await api.updateShelfBook(existingUserBook.id, {
          status,
          current_page: currentPage,
          rating: rating > 0 ? rating : null,
          favorite,
          owned,
          private_notes: privateNotes.trim() || null,
        });
      } else {
        await api.addToShelf({
          book_id: book.id,
          status,
          current_page: currentPage,
          rating: rating > 0 ? rating : null,
          favorite,
          owned,
          private_notes: privateNotes.trim() || null,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar na estante.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!existingUserBook) return;
    if (!confirm(`Deseja remover "${book.title}" da sua estante pessoal?`)) return;

    setIsSubmitting(true);
    try {
      await api.removeFromShelf(existingUserBook.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover da estante.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingUserBook ? "Minha Leitura na Estante" : "Adicionar à Minha Estante"}
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Book Header Card */}
        <div className="flex gap-4 p-3.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              book.cover_url ||
              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
            }
            alt={book.title}
            className="w-16 h-24 object-cover rounded-lg shadow flex-shrink-0"
          />
          <div className="flex flex-col justify-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#d97706]">
              {book.genres?.[0]?.name || "Literatura"}
            </span>
            <h4 className="font-serif font-bold text-neutral-900 dark:text-neutral-100 text-base line-clamp-1">
              {book.title}
            </h4>
            <p className="text-xs text-neutral-500">
              {book.authors?.map((a) => a.name).join(", ") || "Autor desconhecido"}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {book.page_count ? `${book.page_count} páginas` : "Páginas não informadas"}
              {book.publisher?.name ? ` • ${book.publisher.name}` : ""}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Status de Leitura */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
            Status da Leitura
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  status === opt.value
                    ? "bg-[#d97706] text-white border-[#d97706] shadow-sm font-semibold"
                    : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progresso de Páginas */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            <span>Progresso da Leitura</span>
            <span className="text-[#d97706]">
              {currentPage} de {totalPages} pág. ({progressPercent}%)
            </span>
          </div>

          {/* Barra de Progresso Interativa */}
          <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="0"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = Math.max(0, Math.min(totalPages, Number(e.target.value) || 0));
                setCurrentPage(val);
              }}
              className="w-28 text-center font-medium"
            />
            <span className="text-xs text-neutral-500">página atual lida</span>
          </div>
        </div>

        {/* Avaliação em Estrelas & Favorito */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
              Sua Avaliação (0 a 5)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="p-1 text-neutral-300 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`h-5 w-5 ${
                      rating >= star
                        ? "text-amber-400 fill-amber-400"
                        : "text-neutral-300 dark:text-neutral-700"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && <span className="ml-1 text-xs font-semibold">{rating}.0</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
              Preferências
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  favorite
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`} />
                Favorito
              </button>
              <button
                type="button"
                onClick={() => setOwned(!owned)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  owned
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${owned ? "fill-current" : ""}`} />
                Possuo
              </button>
            </div>
          </div>
        </div>

        {/* Anotações Privadas */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Notas Privadas do Leitor (somente visível para você)
          </label>
          <textarea
            rows={2}
            placeholder="Minhas impressões, data que comecei a ler, citações..."
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
          />
        </div>

        {/* Rodapé / Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
          {existingUserBook ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover da Estante
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Salvar na Estante
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
