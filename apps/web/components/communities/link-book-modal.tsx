"use client";

import React, { useState, useEffect } from "react";
import { X, Search, BookOpen, Loader2, Check } from "lucide-react";
import { Button, Input, cn } from "@telebooks/ui";
import type { Book } from "@telebooks/types";
import { api } from "../../lib/api";

interface LinkBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  selectedBookId?: string | null;
}

export function LinkBookModal({
  isOpen,
  onClose,
  onSelectBook,
  selectedBookId,
}: LinkBookModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const res = await api.getBooks({
          q: searchQuery.trim() || undefined,
          page_size: 12,
        });
        setBooks(res.items || []);
      } catch {
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Vincular Livro à Mensagem
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione um livro do catálogo para exibir a capa e detalhes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, autor ou gênero..."
              className="pl-9.5 rounded-full text-xs sm:text-sm h-9.5 bg-white dark:bg-slate-900"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de Livros */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-2" />
              <span>Buscando livros...</span>
            </div>
          ) : books.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum livro encontrado com esses termos.
            </div>
          ) : (
            books.map((book) => {
              const isSelected = selectedBookId === book.id;
              const authorName =
                book.author_name ||
                book.authors?.map((a) => a.name).join(", ") ||
                "Autor desconhecido";

              return (
                <div
                  key={book.id}
                  onClick={() => {
                    onSelectBook(book);
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group",
                    isSelected
                      ? "border-[#007BFF] bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-[#007BFF]"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Capa */}
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 shadow-xs flex items-center justify-center text-slate-400">
                      {book.cover_url || book.thumbnail_url ? (
                        <img
                          src={book.cover_url || book.thumbnail_url || ""}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 opacity-40" />
                      )}
                    </div>

                    {/* Dados */}
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {authorName}
                      </p>
                      {book.page_count && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {book.page_count} páginas
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={isSelected ? "primary" : "outline"}
                    size="sm"
                    className="rounded-full text-xs h-7 px-3 shrink-0"
                    leftIcon={isSelected ? <Check className="w-3 h-3" /> : undefined}
                  >
                    {isSelected ? "Selecionado" : "Vincular"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full text-xs px-4"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
