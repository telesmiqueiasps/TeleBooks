"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Modal, Button, Badge, BadgeVariant } from "@telebooks/ui";
import type { Book, UserBook } from "@telebooks/types";
import { api } from "../../lib/api";

export interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  userBook?: UserBook | null;
  onOpenShelfModal?: (book: Book, userBook?: UserBook | null) => void;
  onOpenEditModal?: (book: Book) => void;
  onDeleteBook?: (bookId: string) => void;
  onBookUpdated?: (book: Book) => void;
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
  onBookUpdated,
}: BookDetailsModalProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [candidateCovers, setCandidateCovers] = useState<string[]>([]);
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);

  // Reseta galeria ao trocar de livro
  React.useEffect(() => {
    setIsGalleryOpen(false);
    setCandidateCovers([]);
  }, [book?.id]);

  if (!book) return null;

  const handleOpenGallery = async () => {
    const nextState = !isGalleryOpen;
    setIsGalleryOpen(nextState);

    if (nextState && candidateCovers.length === 0) {
      setIsLoadingCovers(true);
      try {
        const results = await api.searchCoverOptions({
          isbn: book.isbn13 || book.isbn10 || undefined,
          title: book.title,
          author: book.authors?.[0]?.name,
        });
        const list: string[] = [];
        if (book.cover_url) list.push(book.cover_url);
        if (results) {
          for (const opt of results) {
            if (opt.url && !list.includes(opt.url)) list.push(opt.url);
          }
        }
        setCandidateCovers(list);
      } catch {
        // Silencioso em caso de falha de conexão
      } finally {
        setIsLoadingCovers(false);
      }
    }
  };

  const handleSelectCover = async (coverUrl: string) => {
    try {
      const updated = await api.updateBook(book.id, {
        cover_url: coverUrl,
        thumbnail_url: coverUrl,
      });
      book.cover_url = coverUrl;
      book.thumbnail_url = coverUrl;
      onBookUpdated?.(updated);
    } catch (err) {
      console.error("Erro ao atualizar capa:", err);
    }
  };

  const authorsText =
    book.authors?.map((a) => a.name).join(", ") || "Autor não informado";
  const genresText = book.genres?.map((g) => g.name).join(", ");
  const statusInfo = userBook ? STATUS_LABELS[userBook.status] : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ficha Bibliográfica" size="lg">
      <div className="space-y-6">
        {/* Top: Cover + Core Metadata */}
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-shrink-0 mx-auto sm:mx-0 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                book.cover_url ||
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
              }
              alt={book.title}
              className="w-32 h-48 object-cover rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800"
            />
            <button
              type="button"
              onClick={handleOpenGallery}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#007BFF] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isGalleryOpen ? "Fechar Galeria" : "Galeria de Capas"}</span>
            </button>
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
                  <span>{book.publisher.name}</span>
                </div>
              )}
              {book.publication_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  <span>
                    {new Date(book.publication_date).toLocaleDateString("pt-BR", {
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {book.page_count && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{book.page_count} páginas</span>
                </div>
              )}
              {book.isbn13 && (
                <div className="text-neutral-400">
                  <span className="font-mono">{book.isbn13}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galeria de Capas Integrada (Dentro do Próprio App) */}
        {isGalleryOpen && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Capas Disponíveis para Esta Edição
              </span>
              {isLoadingCovers ? (
                <span className="text-[11px] text-blue-500 flex items-center gap-1.5 font-medium animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando capas na web...
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {candidateCovers.length} {candidateCovers.length === 1 ? "opção" : "opções"}
                </span>
              )}
            </div>

            {candidateCovers.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-thin">
                {candidateCovers.map((covUrl, idx) => {
                  const isSelected = book.cover_url === covUrl;
                  return (
                    <button
                      key={`${covUrl}-${idx}`}
                      type="button"
                      onClick={() => handleSelectCover(covUrl)}
                      className={`group relative flex-shrink-0 w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden border-2 transition-all cursor-pointer book-spine ${
                        isSelected
                          ? "border-[#007BFF] ring-4 ring-[#007BFF]/25 shadow-md scale-105"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-400 opacity-70 hover:opacity-100 hover:scale-102"
                      }`}
                      title="Clique para selecionar e salvar esta capa"
                    >
                      <Image
                        src={covUrl}
                        alt={`Capa ${idx + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#007BFF] text-white flex items-center justify-center shadow">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                {isLoadingCovers
                  ? "Consultando catálogos e livrarias..."
                  : "Nenhuma capa adicional encontrada para esta edição."}
              </p>
            )}
          </div>
        )}

        {/* Status in Shelf Badge */}
        {userBook && statusInfo && (
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookmarkCheck className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
              <div>
                <p className="text-xs text-neutral-500">Status na sua estante</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {userBook.rating && (
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{userBook.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {onOpenShelfModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenShelfModal(book, userBook)}
              >
                Atualizar Progresso
              </Button>
            )}
          </div>
        )}

        {/* Sinopse / Descrição */}
        {book.description && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Sinopse
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto pr-2">
              {book.description}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            {onOpenEditModal && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="h-4 w-4" />}
                onClick={() => onOpenEditModal(book)}
              >
                Editar Livro
              </Button>
            )}

            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Tem certeza que deseja excluir "${book.title}" do catálogo global? Esta ação é irreversível.`
                  )
                ) {
                  onDeleteBook?.(book.id);
                  onClose();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors ml-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir do Catálogo
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/livros/${book.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#007BFF] text-white hover:bg-blue-600 transition-all shadow-xs"
            >
              <span>Ver Página Completa</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
