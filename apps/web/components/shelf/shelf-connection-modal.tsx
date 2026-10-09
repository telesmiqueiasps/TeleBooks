"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  Heart,
  Bookmark,
  Check,
  Trash2,
  AlertCircle,
  Folder,
  Tag,
  Palette,
  Layers,
} from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Book, BookStatus, UserBook, Collection, UserTag } from "@telebooks/types";
import { api } from "../../lib/api";
import { PERSONAL_COLOR_PALETTE } from "./collections-manager-modal";

export interface ShelfConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  existingUserBook?: UserBook | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: BookStatus; label: string; color: string }[] = [
  {
    value: "want_to_read",
    label: "Quero Ler",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    value: "reading",
    label: "Lendo",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    value: "read",
    label: "Lido",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    value: "paused",
    label: "Pausado",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    value: "abandoned",
    label: "Abandonado",
    color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30",
  },
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
  const [personalColor, setPersonalColor] = useState<string | null>(null);

  // Coleções e Tags
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [availableTags, setAvailableTags] = useState<UserTag[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = book?.page_count || 1;

  useEffect(() => {
    if (isOpen) {
      // Carrega coleções e tags do usuário
      api.getCollections().then((cols) => setAvailableCollections(cols || [])).catch(() => {});
      api.getUserTags().then((tags) => setAvailableTags(tags || [])).catch(() => {});

      if (existingUserBook) {
        setStatus(existingUserBook.status);
        setCurrentPage(existingUserBook.current_page || 0);
        setRating(existingUserBook.rating ? Number(existingUserBook.rating) : 0);
        setFavorite(existingUserBook.favorite);
        setOwned(existingUserBook.owned);
        setPrivateNotes(existingUserBook.private_notes || "");
        setPersonalColor(existingUserBook.personal_color || null);
        setSelectedCollectionIds(
          existingUserBook.collections?.map((c) => c.id) || []
        );
        setSelectedTagIds(existingUserBook.tags?.map((t) => t.id) || []);
      } else {
        setStatus("want_to_read");
        setCurrentPage(0);
        setRating(0);
        setFavorite(false);
        setOwned(true);
        setPrivateNotes("");
        setPersonalColor(null);
        setSelectedCollectionIds([]);
        setSelectedTagIds([]);
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

  const toggleCollection = (colId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
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
          personal_color: personalColor,
          collection_ids: selectedCollectionIds,
          tag_ids: selectedTagIds,
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
          personal_color: personalColor,
          collection_ids: selectedCollectionIds,
          tag_ids: selectedTagIds,
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
        <div className="flex gap-4 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              book.cover_url ||
              "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
            }
            alt={book.title}
            className="w-16 h-24 object-cover rounded-xl shadow-xs shrink-0"
          />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#007BFF]">
              {book.genres?.[0]?.name || "Literatura"}
            </span>
            <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-1">
              {book.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {book.authors?.map((a) => a.name).join(", ") || "Autor desconhecido"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {book.page_count ? `${book.page_count} páginas` : "Páginas não informadas"}
              {book.publisher?.name ? ` • ${book.publisher.name}` : ""}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status de Leitura */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
            Status da Leitura
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  status === opt.value
                    ? "bg-[#007BFF] text-white border-[#007BFF] shadow-sm shadow-[#007BFF]/20"
                    : "bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progresso de Páginas */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            <span>Progresso da Leitura</span>
            <span className="text-[#007BFF] font-bold">
              {currentPage} de {totalPages} pág. ({progressPercent}%)
            </span>
          </div>

          {/* Barra de Progresso Interativa */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] transition-all duration-300 rounded-full"
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
              className="w-28 text-center font-bold text-xs"
            />
            <span className="text-xs text-slate-500">página atual lida</span>
          </div>
        </div>

        {/* Avaliação em Estrelas & Preferências */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Sua Avaliação (0 a 5)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`h-5 w-5 ${
                      rating >= star
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-300 dark:text-slate-700"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && <span className="ml-1 text-xs font-bold">{rating}.0</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Preferências
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  favorite
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
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
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${owned ? "fill-current" : ""}`} />
                Possuo
              </button>
            </div>
          </div>
        </div>

        {/* Cor Pessoal da Lombada */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#007BFF]" />
              <span>Cor Pessoal da Lombada</span>
            </label>
            {personalColor && (
              <button
                type="button"
                onClick={() => setPersonalColor(null)}
                className="text-[11px] text-[#007BFF] hover:underline"
              >
                Restaurar Padrão
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPersonalColor(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                personalColor === null
                  ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Padrão
            </button>
            {PERSONAL_COLOR_PALETTE.map((c) => {
              const isSelected = personalColor === c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPersonalColor(c.hex)}
                  className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                    isSelected
                      ? "scale-125 ring-2 ring-offset-2 ring-[#007BFF] shadow-sm"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coleções Pessoais */}
        {availableCollections.length > 0 && (
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#007BFF]" />
              <span>Coleções do Usuário</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableCollections.map((col) => {
                const isSelected = selectedCollectionIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleCollection(col.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/40 font-semibold"
                        : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Folder className="w-3 h-3" />
                    <span>{col.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#007BFF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags Pessoais */}
        {availableTags.length > 0 && (
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#007BFF]" />
              <span>Tags Pessoais</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/40 font-semibold"
                        : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color || "#007BFF" }}
                    />
                    <span>#{tag.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#007BFF]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Anotações Privadas */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
            Notas Privadas do Leitor
          </label>
          <textarea
            rows={2}
            placeholder="Minhas impressões, data que comecei a ler, citações..."
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
          />
        </div>

        {/* Rodapé / Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
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
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="rounded-full text-xs">
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Check className="h-4 w-4" />}
              className="rounded-full text-xs font-semibold"
            >
              Salvar na Estante
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
