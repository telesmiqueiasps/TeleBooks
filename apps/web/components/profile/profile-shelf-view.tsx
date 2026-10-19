"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Library,
  Star,
  Loader2,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Card, Button, Skeleton, cn } from "@telebooks/ui";
import type { UserBook, BookStatus } from "@telebooks/types";
import { api } from "../../lib/api";

export interface ProfileShelfViewProps {
  username: string;
  isOwner?: boolean;
  onTotalBooksChange?: (total: number) => void;
}

const STATUS_FILTERS: { label: string; value: BookStatus | "all"; color?: string }[] = [
  { label: "Todos", value: "all" },
  { label: "Lendo", value: "reading", color: "text-blue-600 dark:text-blue-400" },
  { label: "Lidos", value: "read", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Quero Ler", value: "want_to_read", color: "text-amber-600 dark:text-amber-400" },
  { label: "Pausados", value: "paused", color: "text-purple-600 dark:text-purple-400" },
  { label: "Abandonados", value: "abandoned", color: "text-slate-500 dark:text-slate-400" },
];

export function ProfileShelfView({
  username,
  isOwner = false,
  onTotalBooksChange,
}: ProfileShelfViewProps) {
  const router = useRouter();

  const [books, setBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookStatus | "all">("all");

  const loadShelfBooks = useCallback(
    async (pageToLoad = 1, append = false, statusFilter = selectedStatus) => {
      if (!username) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const res = await api.getUserShelf(username, {
          status: statusFilter === "all" ? undefined : statusFilter,
          page: pageToLoad,
          page_size: 24,
        });

        if (append) {
          setBooks((prev) => [...prev, ...res.items]);
        } else {
          setBooks(res.items);
        }

        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.page < res.total_pages);

        if (onTotalBooksChange && statusFilter === "all") {
          onTotalBooksChange(res.total);
        }
      } catch {
        // Falha silenciosa
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [username, selectedStatus, onTotalBooksChange]
  );

  useEffect(() => {
    loadShelfBooks(1, false, selectedStatus);
  }, [selectedStatus, loadShelfBooks]);

  const handleStatusChange = (newStatus: BookStatus | "all") => {
    if (newStatus === selectedStatus) return;
    setSelectedStatus(newStatus);
  };

  const getStatusBadge = (status: BookStatus) => {
    switch (status) {
      case "reading":
        return { label: "Lendo", bg: "bg-blue-600" };
      case "read":
        return { label: "Lido", bg: "bg-emerald-600" };
      case "want_to_read":
        return { label: "Quero Ler", bg: "bg-amber-600" };
      case "paused":
        return { label: "Pausado", bg: "bg-purple-600" };
      case "abandoned":
        return { label: "Abandonado", bg: "bg-slate-500" };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Topo da Estante com Filtros e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Filtros em Pílulas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {STATUS_FILTERS.map((f) => {
            const isSelected = selectedStatus === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => handleStatusChange(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  isSelected
                    ? "bg-[#007BFF] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/60"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Informação / Atalho */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>
            <strong className="text-slate-800 dark:text-slate-200">{total}</strong>{" "}
            {total === 1 ? "livro" : "livros"}
          </span>

          {isOwner && (
            <Link
              href="/minha-biblioteca"
              className="inline-flex items-center gap-1 text-[#007BFF] hover:underline font-semibold"
            >
              <span>Gerenciar estante</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Grid de Cards Compactos de Livros (Mínimo de 5 por linha no mobile) */}
      {isLoading ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="aspect-[2/3] w-full rounded-lg sm:rounded-xl" />
              <Skeleton className="h-2.5 w-4/5 rounded-md" />
              <Skeleton className="h-2 w-3/5 rounded-md" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto">
            <Library className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {selectedStatus === "all"
              ? isOwner
                ? "Sua estante ainda está vazia"
                : "Este usuário ainda não adicionou livros"
              : "Nenhum livro neste status"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isOwner
              ? "Busque livros no catálogo ou cadastre novas obras para organizar sua estante literária pessoal."
              : "Quando o leitor adicionar obras à estante dele, elas aparecerão listadas aqui."}
          </p>
          {isOwner && (
            <Link href="/minha-biblioteca">
              <Button
                variant="primary"
                size="sm"
                className="rounded-full text-xs px-5 bg-[#007BFF] text-white mt-2"
              >
                Ir para a Minha Biblioteca
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2.5">
            {books.map((ub) => {
              const book = ub.book;
              const title = book?.title || "Sem título";
              const authorName =
                book?.authors && book.authors.length > 0
                  ? book.authors.map((a) => a.name).join(", ")
                  : "Autor desconhecido";
              const coverUrl = book?.cover_url;
              const statusBadge = getStatusBadge(ub.status);
              const progressPercent =
                book?.page_count && book.page_count > 0 && ub.current_page > 0
                  ? Math.min(100, Math.round((ub.current_page / book.page_count) * 100))
                  : null;

              return (
                <div
                  key={ub.id}
                  onClick={() => router.push(`/livros/${ub.book_id}`)}
                  className="group relative flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 select-none"
                  title={`${title} - ${authorName}`}
                >
                  {/* Container da Capa Compacta */}
                  <div className="relative aspect-[2/3] w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-2xs group-hover:shadow-md transition-shadow">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 text-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 text-slate-500">
                        <BookOpen className="w-4 h-4 mb-0.5 opacity-50" />
                        <span className="text-[8px] sm:text-[9px] font-bold line-clamp-2 leading-tight">
                          {title}
                        </span>
                      </div>
                    )}

                    {/* Selo de Avaliação (se houver) */}
                    {ub.rating && Number(ub.rating) > 0 && (
                      <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/70 backdrop-blur-xs text-amber-300 text-[8px] sm:text-[9px] font-bold shadow-xs">
                        <Star className="w-2 h-2 fill-amber-300 text-amber-300" />
                        <span>{Number(ub.rating).toFixed(1)}</span>
                      </div>
                    )}

                    {/* Selo de Status (Micro) */}
                    {statusBadge && (
                      <div
                        className={cn(
                          "absolute top-0.5 right-0.5 px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-bold text-white shadow-xs leading-none",
                          statusBadge.bg
                        )}
                      >
                        {statusBadge.label}
                      </div>
                    )}

                    {/* Barra de Progresso (apenas para livros Lendo) */}
                    {ub.status === "reading" && progressPercent !== null && (
                      <div className="absolute bottom-0 inset-x-0 h-0.5 sm:h-1 bg-black/40 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Informações Textuais Compactas */}
                  <div className="mt-1 min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-[#007BFF] transition-colors">
                      {title}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5 font-normal">
                      {authorName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Carregar Mais */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs px-6 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                onClick={() => loadShelfBooks(page + 1, true, selectedStatus)}
                disabled={isLoadingMore}
                leftIcon={
                  isLoadingMore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007BFF]" />
                  ) : undefined
                }
              >
                {isLoadingMore ? "Carregando mais livros..." : "Carregar mais livros"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
