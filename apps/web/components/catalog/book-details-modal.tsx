"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
  Building2,
  FileText,
  Star,
  BookmarkPlus,
  Edit3,
  Trash2,
  BookmarkCheck,
} from "lucide-react";
import { Modal, Button, Badge, BadgeVariant } from "@telebooks/ui";
import type { Book, UserBook } from "@telebooks/types";

export interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  userBook?: UserBook | null;
  onOpenShelfModal?: (book: Book, userBook?: UserBook | null) => void;
  onOpenEditModal?: (book: Book) => void;
  onDeleteBook?: (bookId: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  want_to_read: { label: "Quero Ler", variant: "want_to_read" },
  reading: { label: "Lendo", variant: "reading" },
  read: { label: "Lido", variant: "read" },
  paused: { label: "Pausado", variant: "paused" },
  abandoned: { label: "Abandonado", variant: "abandoned" },
};

export function BookDetailsModal({
  isOpen,
  onClose,
  book,
  userBook,
  onOpenShelfModal,
  onOpenEditModal,
  onDeleteBook,
}: BookDetailsModalProps) {
  if (!book) return null;

  const authorsText =
    book.authors?.map((a) => a.name).join(", ") || "Autor não informado";
  const genresText = book.genres?.map((g) => g.name).join(", ");
  const statusInfo = userBook ? STATUS_LABELS[userBook.status] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha Bibliográfica" size="lg">
      <div className="space-y-6">
        {/* Top: Cover + Core Metadata */}
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                book.cover_url ||
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
              }
              alt={book.title}
              className="w-32 h-48 object-cover rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {book.genres?.map((g) => (
                <span
                  key={g.id}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                >
                  {g.name}
                </span>
              ))}
            </div>

            <h3 className="font-serif text-2xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
              {book.title}
            </h3>

            {book.subtitle && (
              <p className="text-sm text-neutral-500 italic">{book.subtitle}</p>
            )}

            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              por <span className="font-semibold text-neutral-900 dark:text-white">{authorsText}</span>
            </p>

            {/* Technical grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-neutral-600 dark:text-neutral-400">
              {book.publisher && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Editora: <strong>{book.publisher.name}</strong></span>
                </div>
              )}
              {book.page_count && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{book.page_count} páginas</span>
                </div>
              )}
              {book.isbn13 && (
                <div className="flex items-center gap-1.5">
                  <span>ISBN: <strong>{book.isbn13}</strong></span>
                </div>
              )}
              {book.language && (
                <div className="flex items-center gap-1.5">
                  <span>Idioma: <strong>{book.language}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sinopse */}
        {book.description && (
          <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Sinopse
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
              {book.description}
            </p>
          </div>
        )}

        {/* Bloco de Vínculo Pessoal (Minha Estante) */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Minha Biblioteca
              </span>
              {userBook ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusInfo?.variant || "default"}>
                    {statusInfo?.label || userBook.status}
                  </Badge>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    Página {userBook.current_page} de {book.page_count || "?"} (
                    {Math.round(
                      (userBook.current_page / (book.page_count || 1)) * 100
                    )}
                    %)
                  </span>
                  {userBook.rating && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                      <Star className="h-3 w-3 fill-amber-500" />
                      {userBook.rating}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 mt-0.5">
                  Este livro ainda não está vinculado à sua estante pessoal.
                </p>
              )}
            </div>

            <Button
              variant={userBook ? "outline" : "primary"}
              onClick={() => {
                onClose();
                onOpenShelfModal?.(book, userBook);
              }}
              leftIcon={userBook ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
            >
              {userBook ? "Editar Minha Leitura" : "Adicionar à Minha Estante"}
            </Button>
          </div>

          {userBook?.private_notes && (
            <div className="mt-3 pt-3 border-t border-amber-500/10 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Minhas notas: </span>
              {userBook.private_notes}
            </div>
          )}
        </div>

        {/* Rodapé: Ações de Gestão do Catálogo */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditModal?.(book);
              }}
              className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar Dados Bibliográficos
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir permanentemente "${book.title}" do catálogo global?`)) {
                  onDeleteBook?.(book.id);
                  onClose();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir do Catálogo
            </button>
          </div>

          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
