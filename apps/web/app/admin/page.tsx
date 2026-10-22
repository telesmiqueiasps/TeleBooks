"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  Calendar,
  FileText,
  Barcode,
  Search,
  RefreshCw,
  Loader2,
  Edit3,
  Sparkles,
  ImageOff,
  AlertTriangle,
  Layers,
  Check,
} from "lucide-react";
import { AppShell } from "../../components/shell/app-shell";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";
import { Button, Modal } from "@telebooks/ui";
import type {
  Book,
  BookSubmission,
  BookSubmissionUpdate,
  BookUpdatePayload,
  IncompleteBooksCounts,
  SubmissionStatus,
} from "@telebooks/types";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "agora há pouco";
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();

  // Controle de Abas Principais do Painel
  const [activeMainTab, setActiveMainTab] = useState<"submissions" | "incomplete_books">("submissions");

  // ==========================================================================
  // ESTADO: Moderação de Submissões Manuais
  // ==========================================================================
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [totalSubmissionsCount, setTotalSubmissionsCount] = useState(0);
  const [selectedSubmissionStatus, setSelectedSubmissionStatus] = useState<SubmissionStatus | "all">("pending");
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<BookSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edição de Submissão antes de Aprovar
  const [editingSubmission, setEditingSubmission] = useState<BookSubmission | null>(null);
  const [editSubTitle, setEditSubTitle] = useState("");
  const [editSubSubtitle, setEditSubSubtitle] = useState("");
  const [editSubAuthors, setEditSubAuthors] = useState("");
  const [editSubPublisher, setEditSubPublisher] = useState("");
  const [editSubDescription, setEditSubDescription] = useState("");
  const [editSubIsbn13, setEditSubIsbn13] = useState("");
  const [editSubIsbn10, setEditSubIsbn10] = useState("");
  const [editSubPageCount, setEditSubPageCount] = useState("");
  const [editSubCoverUrl, setEditSubCoverUrl] = useState("");
  const [isSavingSubEdit, setIsSavingSubEdit] = useState(false);

  // ==========================================================================
  // ESTADO: Ajuste de Livros Incompletos no Catálogo
  // ==========================================================================
  const [incompleteBooks, setIncompleteBooks] = useState<Book[]>([]);
  const [incompleteTotal, setIncompleteTotal] = useState(0);
  const [incompleteCounts, setIncompleteCounts] = useState<IncompleteBooksCounts>({
    all: 0,
    missing_author: 0,
    missing_pages: 0,
    missing_cover: 0,
  });
  const [selectedIncompleteFilter, setSelectedIncompleteFilter] = useState<
    "all" | "missing_author" | "missing_pages" | "missing_cover"
  >("all");
  const [incompleteSearchQuery, setIncompleteSearchQuery] = useState("");
  const [isLoadingIncomplete, setIsLoadingIncomplete] = useState(false);

  // Edição de Livro do Catálogo
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editBookTitle, setEditBookTitle] = useState("");
  const [editBookSubtitle, setEditBookSubtitle] = useState("");
  const [editBookAuthors, setEditBookAuthors] = useState("");
  const [editBookPublisher, setEditBookPublisher] = useState("");
  const [editBookDescription, setEditBookDescription] = useState("");
  const [editBookIsbn13, setEditBookIsbn13] = useState("");
  const [editBookIsbn10, setEditBookIsbn10] = useState("");
  const [editBookPageCount, setEditBookPageCount] = useState("");
  const [editBookCoverUrl, setEditBookCoverUrl] = useState("");
  const [isSavingBookEdit, setIsSavingBookEdit] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregamento de Submissões
  const loadSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    try {
      const statusParam = selectedSubmissionStatus === "all" ? undefined : selectedSubmissionStatus;
      const res = await api.getAdminBookSubmissions({
        status: statusParam,
        page: 1,
        page_size: 50,
      });
      setSubmissions(res.items || []);
      setTotalSubmissionsCount(res.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar fila de moderação.";
      showToast(msg);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [selectedSubmissionStatus]);

  // Carregamento de Livros Incompletos
  const loadIncompleteBooks = useCallback(async () => {
    setIsLoadingIncomplete(true);
    try {
      const res = await api.getAdminIncompleteBooks({
        filter: selectedIncompleteFilter,
        q: incompleteSearchQuery.trim() || undefined,
        page: 1,
        page_size: 50,
      });
      setIncompleteBooks(res.items || []);
      setIncompleteTotal(res.total || 0);
      if (res.counts) {
        setIncompleteCounts(res.counts);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar livros incompletos.";
      showToast(msg);
    } finally {
      setIsLoadingIncomplete(false);
    }
  }, [selectedIncompleteFilter, incompleteSearchQuery]);

  // Efeito inicial para checar perfil e carregar dados
  useEffect(() => {
    if (!isAuthLoading && user && profile?.role === "admin") {
      if (activeMainTab === "submissions") {
        loadSubmissions();
      } else {
        loadIncompleteBooks();
      }
    }
  }, [isAuthLoading, user, profile, activeMainTab, loadSubmissions, loadIncompleteBooks]);

  // Carrega contagens de incompletos em background para alimentar o badge da aba
  useEffect(() => {
    if (!isAuthLoading && user && profile?.role === "admin") {
      api.getAdminIncompleteBooks({ page: 1, page_size: 1 })
        .then((res) => {
          if (res.counts) setIncompleteCounts(res.counts);
        })
        .catch(() => {});
    }
  }, [isAuthLoading, user, profile]);

  // ==========================================================================
  // HANDLERS: Submissões
  // ==========================================================================
  const handleOpenEditSubmission = (sub: BookSubmission) => {
    setEditingSubmission(sub);
    setEditSubTitle(sub.title || "");
    setEditSubSubtitle(sub.subtitle || "");
    setEditSubAuthors(sub.author_names?.join(", ") || "");
    setEditSubPublisher(sub.publisher_name || "");
    setEditSubDescription(sub.description || "");
    setEditSubIsbn13(sub.isbn13 || "");
    setEditSubIsbn10(sub.isbn10 || "");
    setEditSubPageCount(sub.page_count ? String(sub.page_count) : "");
    setEditSubCoverUrl(sub.cover_url || "");
  };

  const handleSaveEditSubmission = async (andApprove: boolean = false) => {
    if (!editingSubmission || isSavingSubEdit) return;

    if (!editSubTitle.trim()) {
      showToast("O título da obra é obrigatório.");
      return;
    }

    const cleanAuthors = editSubAuthors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (cleanAuthors.length === 0) {
      showToast("Informe ao menos um autor para a obra.");
      return;
    }

    setIsSavingSubEdit(true);
    try {
      const payload: BookSubmissionUpdate = {
        title: editSubTitle.trim(),
        subtitle: editSubSubtitle.trim() || null,
        author_names: cleanAuthors,
        publisher_name: editSubPublisher.trim() || null,
        description: editSubDescription.trim() || null,
        isbn13: editSubIsbn13.trim() || null,
        isbn10: editSubIsbn10.trim() || null,
        page_count: editSubPageCount ? parseInt(editSubPageCount, 10) : null,
        cover_url: editSubCoverUrl.trim() || null,
      };

      const updated = await api.updateBookSubmission(editingSubmission.id, payload);

      if (andApprove) {
        await api.approveBookSubmission(editingSubmission.id);
        showToast(`Livro "${updated.title}" corrigido e aprovado com sucesso!`);
        setSubmissions((prev) =>
          prev.map((item) =>
            item.id === editingSubmission.id ? { ...updated, status: "approved" as SubmissionStatus } : item
          )
        );
        if (selectedSubmissionStatus === "pending") {
          setSubmissions((prev) => prev.filter((item) => item.id !== editingSubmission.id));
        }
      } else {
        showToast("Correções salvas com sucesso!");
        setSubmissions((prev) =>
          prev.map((item) => (item.id === editingSubmission.id ? { ...item, ...updated } : item))
        );
      }

      setEditingSubmission(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alterações.";
      showToast(msg);
    } finally {
      setIsSavingSubEdit(false);
    }
  };

  const handleApprove = async (sub: BookSubmission) => {
    if (processingId) return;
    setProcessingId(sub.id);
    try {
      await api.approveBookSubmission(sub.id);
      showToast(`Livro "${sub.title}" aprovado e adicionado ao catálogo!`);
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === sub.id ? { ...item, status: "approved" as SubmissionStatus } : item
        )
      );
      if (selectedSubmissionStatus === "pending") {
        setSubmissions((prev) => prev.filter((item) => item.id !== sub.id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao aprovar livro.";
      showToast(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem || processingId) return;
    setProcessingId(rejectingItem.id);
    try {
      await api.rejectBookSubmission(rejectingItem.id, rejectReason.trim() || undefined);
      showToast(`Livro "${rejectingItem.title}" foi rejeitado.`);
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === rejectingItem.id
            ? { ...item, status: "rejected" as SubmissionStatus, rejection_reason: rejectReason.trim() }
            : item
        )
      );
      if (selectedSubmissionStatus === "pending") {
        setSubmissions((prev) => prev.filter((item) => item.id !== rejectingItem.id));
      }
      setRejectingItem(null);
      setRejectReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao rejeitar livro.";
      showToast(msg);
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: Edição de Livro Incompleto no Catálogo
  // ==========================================================================
  const handleOpenEditBook = (book: Book) => {
    setEditingBook(book);
    setEditBookTitle(book.title || "");
    setEditBookSubtitle(book.subtitle || "");
    const authorsStr =
      book.authors && book.authors.length > 0
        ? book.authors.map((a) => a.name).join(", ")
        : book.author_name || "";
    setEditBookAuthors(authorsStr);
    setEditBookPublisher(book.publisher?.name || "");
    setEditBookDescription(book.description || "");
    setEditBookIsbn13(book.isbn13 || "");
    setEditBookIsbn10(book.isbn10 || "");
    setEditBookPageCount(book.page_count ? String(book.page_count) : "");
    setEditBookCoverUrl(book.cover_url || "");
  };

  const handleSaveBookEdit = async () => {
    if (!editingBook || isSavingBookEdit) return;

    if (!editBookTitle.trim()) {
      showToast("O título da obra é obrigatório.");
      return;
    }

    const cleanAuthors = editBookAuthors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    setIsSavingBookEdit(true);
    try {
      const payload: BookUpdatePayload = {
        title: editBookTitle.trim(),
        subtitle: editBookSubtitle.trim() || null,
        author_name: cleanAuthors.length > 0 ? cleanAuthors.join(", ") : null,
        author_names: cleanAuthors.length > 0 ? cleanAuthors : undefined,
        publisher_name: editBookPublisher.trim() || null,
        description: editBookDescription.trim() || null,
        isbn13: editBookIsbn13.trim() || null,
        isbn10: editBookIsbn10.trim() || null,
        page_count: editBookPageCount ? parseInt(editBookPageCount, 10) : null,
        cover_url: editBookCoverUrl.trim() || null,
      };

      const updated = await api.updateCatalogBook(editingBook.id, payload);
      showToast(`Livro "${updated.title}" atualizado com sucesso no catálogo!`);

      // Atualiza lista local
      setIncompleteBooks((prev) =>
        prev.map((b) => (b.id === editingBook.id ? { ...b, ...updated } : b))
      );
      setEditingBook(null);

      // Recarrega contadores e lista atualizada
      loadIncompleteBooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar livro.";
      showToast(msg);
    } finally {
      setIsSavingBookEdit(false);
    }
  };

  // Se o usuário ainda está carregando a sessão
  if (isAuthLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#006CEB]" />
        </div>
      </AppShell>
    );
  }

  // Se o usuário NÃO for administrador
  if (!profile || profile.role !== "admin") {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Acesso Restrito a Administradores
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta área é destinada exclusivamente à equipe de suporte e moderação do TeleBooks para análise de submissões e curadoria do acervo.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => router.push("/")} className="rounded-full">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Filtros de busca local para agilidade visual
  const filteredSubmissions = submissions.filter((sub) => {
    if (!submissionSearchQuery.trim()) return true;
    const q = submissionSearchQuery.toLowerCase();
    const titleMatch = sub.title?.toLowerCase().includes(q);
    const authorMatch = sub.author_names?.some((a) => a.toLowerCase().includes(q));
    const isbnMatch = (sub.isbn13 && sub.isbn13.includes(q)) || (sub.isbn10 && sub.isbn10.includes(q));
    return titleMatch || authorMatch || isbnMatch;
  });

  const filteredIncompleteBooks = incompleteBooks.filter((book) => {
    if (!incompleteSearchQuery.trim()) return true;
    const q = incompleteSearchQuery.toLowerCase();
    const titleMatch = book.title?.toLowerCase().includes(q);
    const authorMatch =
      book.author_name?.toLowerCase().includes(q) ||
      book.authors?.some((a) => a.name.toLowerCase().includes(q));
    const isbnMatch = (book.isbn13 && book.isbn13.includes(q)) || (book.isbn10 && book.isbn10.includes(q));
    return titleMatch || authorMatch || isbnMatch;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        {/* Toast Notificação */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-slate-700 dark:border-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                Painel do Administrador
              </span>
              <span className="text-xs text-slate-400">TeleBooks Admin</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeMainTab === "submissions"
                ? "Moderação de Livros Manuais"
                : "Ajuste de Livros Incompletos"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {activeMainTab === "submissions"
                ? "Analise e aprove as obras cadastradas manualmente pelos leitores antes de integrá-las ao acervo global."
                : "Filtre livros com autor desconhecido ou sem autor, livros sem páginas definidas ou sem capa, e salve correções diretamente."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={activeMainTab === "submissions" ? loadSubmissions : loadIncompleteBooks}
              disabled={activeMainTab === "submissions" ? isLoadingSubmissions : isLoadingIncomplete}
              leftIcon={
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    (activeMainTab === "submissions" ? isLoadingSubmissions : isLoadingIncomplete)
                      ? "animate-spin"
                      : ""
                  }`}
                />
              }
              className="rounded-full text-xs font-semibold cursor-pointer"
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* ABAS PRINCIPAIS DO PAINEL */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-0">
          <button
            type="button"
            onClick={() => setActiveMainTab("submissions")}
            className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeMainTab === "submissions"
                ? "border-[#006CEB] text-[#006CEB]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Moderação de Submissões</span>
            {totalSubmissionsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {totalSubmissionsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("incomplete_books")}
            className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeMainTab === "incomplete_books"
                ? "border-[#006CEB] text-[#006CEB]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Ajuste de Livros Incompletos</span>
            {incompleteCounts.all > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                {incompleteCounts.all}
              </span>
            )}
          </button>
        </div>

        {/* ==================================================================== */}
        {/* CONTEÚDO DA ABA 1: MODERAÇÃO DE SUBMISSÕES                          */}
        {/* ==================================================================== */}
        {activeMainTab === "submissions" && (
          <div className="space-y-5">
            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Abas de Status */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
                {(
                  [
                    { id: "pending", label: "Pendentes" },
                    { id: "approved", label: "Aprovados" },
                    { id: "rejected", label: "Rejeitados" },
                    { id: "all", label: "Todos" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedSubmissionStatus(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedSubmissionStatus === st.id
                        ? "bg-white dark:bg-[#006CEB] text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Busca Textual */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por título, autor..."
                  value={submissionSearchQuery}
                  onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                />
              </div>
            </div>

            {/* Lista de Livros Submetidos */}
            {isLoadingSubmissions ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#006CEB] mx-auto" />
                <p className="text-xs text-slate-400">Carregando livros da fila de moderação...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma submissão encontrada
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Não há livros nesta categoria no momento. Quando leitores cadastrarem obras manuais, elas aparecerão aqui para validação.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((sub) => {
                  const authorsText = sub.author_names?.join(", ") || "Autor não informado";
                  const isProcessing = processingId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs flex flex-col sm:flex-row gap-4 sm:gap-5 transition-all hover:border-blue-300 dark:hover:border-blue-900/60"
                    >
                      {/* Capa */}
                      <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-700/50 self-start">
                        {sub.cover_url ? (
                          <Image
                            src={sub.cover_url}
                            alt={sub.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                              {sub.title}
                            </h3>
                            {sub.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {sub.subtitle}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-[#006CEB] dark:text-blue-400 mt-1">
                              {authorsText}
                            </p>
                          </div>

                          {/* Badge de Status */}
                          <div>
                            {sub.status === "pending" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                                <Clock className="w-3.5 h-3.5" /> Pendente
                              </span>
                            )}
                            {sub.status === "approved" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                              </span>
                            )}
                            {sub.status === "rejected" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/40">
                                <XCircle className="w-3.5 h-3.5" /> Rejeitado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detalhes Técnicos */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {sub.publisher_name && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{sub.publisher_name}</span>
                            </div>
                          )}
                          {sub.page_count && (
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>{sub.page_count} páginas</span>
                            </div>
                          )}
                          {(sub.isbn13 || sub.isbn10) && (
                            <div className="flex items-center gap-1.5">
                              <Barcode className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{sub.isbn13 || sub.isbn10}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Cadastrado {formatRelativeTime(sub.created_at)}</span>
                          </div>
                        </div>

                        {/* Sinopse / Descrição prévia */}
                        {sub.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                            {sub.description}
                          </p>
                        )}

                        {/* Motivo de Rejeição se aplicável */}
                        {sub.status === "rejected" && sub.rejection_reason && (
                          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                            <span className="font-bold">Motivo da reprovação:</span>
                            <p>{sub.rejection_reason}</p>
                          </div>
                        )}

                        {/* Ações de Moderação */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="text-[11px] text-slate-400">
                            ID da Submissão: <span className="font-mono">{sub.id.slice(0, 8)}</span>
                          </div>

                          {sub.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleOpenEditSubmission(sub)}
                                leftIcon={<Edit3 className="w-3.5 h-3.5 text-blue-500" />}
                                className="rounded-full text-xs font-semibold cursor-pointer"
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => {
                                  setRejectingItem(sub);
                                  setRejectReason("");
                                }}
                                className="rounded-full text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 cursor-pointer"
                              >
                                Reprovar
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isProcessing}
                                isLoading={isProcessing}
                                onClick={() => handleApprove(sub)}
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                className="rounded-full text-xs font-bold cursor-pointer"
                              >
                                Aprovar Livro
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* CONTEÚDO DA ABA 2: AJUSTE DE LIVROS INCOMPLETOS                      */}
        {/* ==================================================================== */}
        {activeMainTab === "incomplete_books" && (
          <div className="space-y-5">
            {/* Barra de Filtros de Pendências e Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filtros por tipo de pendência */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
                {[
                  { id: "all", label: "Todas com pendências", count: incompleteCounts.all },
                  { id: "missing_author", label: "Sem autor / Desconhecido", count: incompleteCounts.missing_author },
                  { id: "missing_pages", label: "Sem páginas", count: incompleteCounts.missing_pages },
                  { id: "missing_cover", label: "Sem capa", count: incompleteCounts.missing_cover },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedIncompleteFilter(
                        item.id as "all" | "missing_author" | "missing_pages" | "missing_cover"
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedIncompleteFilter === item.id
                        ? "bg-white dark:bg-[#006CEB] text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedIncompleteFilter === item.id
                          ? "bg-slate-100 dark:bg-white/20 text-slate-900 dark:text-white"
                          : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Busca Textual */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por título, autor, ISBN..."
                  value={incompleteSearchQuery}
                  onChange={(e) => setIncompleteSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                />
              </div>
            </div>

            {/* Listagem de Obras com Pendências */}
            {isLoadingIncomplete ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#006CEB] mx-auto" />
                <p className="text-xs text-slate-400">Varrendo o acervo e localizando livros incompletos...</p>
              </div>
            ) : filteredIncompleteBooks.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum livro com esta pendência!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Todas as obras cadastradas nesta categoria possuem as informações completas e devidamente preenchidas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIncompleteBooks.map((book) => {
                  const isMissingAuthor =
                    !book.author_name ||
                    book.author_name.trim() === "" ||
                    book.author_name.toLowerCase().includes("desconhecido") ||
                    book.author_name.toLowerCase().includes("unknown") ||
                    !book.authors ||
                    book.authors.length === 0;

                  const isMissingPages = !book.page_count || book.page_count <= 0;
                  const isMissingCover = !book.cover_url || book.cover_url.trim() === "";

                  const authorsText =
                    book.author_name ||
                    (book.authors && book.authors.length > 0
                      ? book.authors.map((a) => a.name).join(", ")
                      : "Sem autor definido");

                  return (
                    <div
                      key={book.id}
                      className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs flex flex-col sm:flex-row gap-4 sm:gap-5 transition-all hover:border-blue-300 dark:hover:border-blue-900/60"
                    >
                      {/* Capa com indicador se ausente */}
                      <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-700/50 self-start">
                        {book.cover_url ? (
                          <Image
                            src={book.cover_url}
                            alt={book.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <ImageOff className="w-6 h-6 stroke-[1.5] text-slate-400 mb-1" />
                            <span className="text-[10px] font-semibold text-slate-500">Sem Capa</span>
                          </div>
                        )}
                      </div>

                      {/* Informações e Badges de Inconsistência */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                              {book.title}
                            </h3>
                            {book.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {book.subtitle}
                              </p>
                            )}
                            <p
                              className={`text-xs font-semibold mt-1 ${
                                isMissingAuthor
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : "text-[#006CEB] dark:text-blue-400"
                              }`}
                            >
                              {authorsText}
                            </p>
                          </div>

                          {/* Pílulas de Alerta das Informações Faltando */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isMissingAuthor && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/40">
                                <User className="w-3 h-3" /> Sem autor
                              </span>
                            )}
                            {isMissingPages && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                                <FileText className="w-3 h-3" /> Sem páginas
                              </span>
                            )}
                            {isMissingCover && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300/40">
                                <ImageOff className="w-3 h-3" /> Sem capa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadados Técnicos */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{book.publisher?.name || "Editora não cadastrada"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span className={isMissingPages ? "text-amber-600 font-semibold" : ""}>
                              {book.page_count ? `${book.page_count} páginas` : "Páginas não informadas"}
                            </span>
                          </div>
                          {(book.isbn13 || book.isbn10) && (
                            <div className="flex items-center gap-1.5">
                              <Barcode className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{book.isbn13 || book.isbn10}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Última atualização {formatRelativeTime(book.updated_at)}</span>
                          </div>
                        </div>

                        {/* Sinopse resumida se houver */}
                        {book.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                            {book.description}
                          </p>
                        )}

                        {/* Barra de Ações */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="text-[11px] text-slate-400">
                            UUID: <span className="font-mono">{book.id.slice(0, 8)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenEditBook(book)}
                              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                              className="rounded-full text-xs font-bold cursor-pointer"
                            >
                              Corrigir Informações
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODAIS                                                              */}
        {/* ==================================================================== */}

        {/* Modal de Confirmação de Reprovação de Submissão com Motivo */}
        <Modal
          isOpen={!!rejectingItem}
          onClose={() => {
            if (!processingId) setRejectingItem(null);
          }}
          title="Reprovar Cadastro Manual de Livro"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está prestes a rejeitar o livro{" "}
              <strong>&ldquo;{rejectingItem?.title}&rdquo;</strong>. O leitor receberá uma notificação informando o motivo da recusa.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Motivo da recusa (opcional, porém recomendado):
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Dados bibliográficos inconsistentes, capa de baixa resolução ou livro já existente no catálogo sob outro ISBN."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingItem(null)}
                disabled={!!processingId}
                className="rounded-full text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={!!processingId}
                className="rounded-full text-xs bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Confirmar Reprovação
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Edição de Submissão antes de Aprovar */}
        <Modal
          isOpen={!!editingSubmission}
          onClose={() => {
            if (!isSavingSubEdit) setEditingSubmission(null);
          }}
          title="Editar Dados da Submissão antes de Aprovar"
          size="lg"
        >
          {editingSubmission && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#006CEB] shrink-0 mt-0.5" />
                <p>
                  Como administrador, você pode ajustar o título, autores, editora, páginas, ISBN ou capa para garantir a qualidade do catálogo compartilhado antes de aprovar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Título da Obra *
                  </label>
                  <input
                    type="text"
                    value={editSubTitle}
                    onChange={(e) => setEditSubTitle(e.target.value)}
                    placeholder="Ex: O Nome do Vento"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    value={editSubSubtitle}
                    onChange={(e) => setEditSubSubtitle(e.target.value)}
                    placeholder="Ex: A Crônica do Matador do Rei: Primeiro Dia"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Autor(es) * (separados por vírgula se houver mais de um)
                  </label>
                  <input
                    type="text"
                    value={editSubAuthors}
                    onChange={(e) => setEditSubAuthors(e.target.value)}
                    placeholder="Ex: Patrick Rothfuss, Neil Gaiman"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Editora
                  </label>
                  <input
                    type="text"
                    value={editSubPublisher}
                    onChange={(e) => setEditSubPublisher(e.target.value)}
                    placeholder="Ex: Arqueiro, Companhia das Letras"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total de Páginas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editSubPageCount}
                    onChange={(e) => setEditSubPageCount(e.target.value)}
                    placeholder="Ex: 656"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ISBN-13
                  </label>
                  <input
                    type="text"
                    value={editSubIsbn13}
                    onChange={(e) => setEditSubIsbn13(e.target.value)}
                    placeholder="Ex: 9788580419078"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ISBN-10
                  </label>
                  <input
                    type="text"
                    value={editSubIsbn10}
                    onChange={(e) => setEditSubIsbn10(e.target.value)}
                    placeholder="Ex: 8580419077"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    URL da Imagem da Capa
                  </label>
                  <input
                    type="url"
                    value={editSubCoverUrl}
                    onChange={(e) => setEditSubCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sinopse / Descrição
                  </label>
                  <textarea
                    rows={3}
                    value={editSubDescription}
                    onChange={(e) => setEditSubDescription(e.target.value)}
                    placeholder="Breve descrição da obra..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSubmission(null)}
                  disabled={isSavingSubEdit}
                  className="rounded-full text-xs w-full sm:w-auto cursor-pointer"
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveEditSubmission(false)}
                    isLoading={isSavingSubEdit}
                    className="rounded-full text-xs w-full sm:w-auto font-semibold cursor-pointer"
                  >
                    Salvar Correções
                  </Button>
                  {editingSubmission.status === "pending" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEditSubmission(true)}
                      isLoading={isSavingSubEdit}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="rounded-full text-xs font-bold w-full sm:w-auto cursor-pointer"
                    >
                      Salvar e Aprovar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de Edição de Livro do Catálogo Global (Ajuste de Informações Faltando) */}
        <Modal
          isOpen={!!editingBook}
          onClose={() => {
            if (!isSavingBookEdit) setEditingBook(null);
          }}
          title="Corrigir Informações da Obra no Catálogo"
          size="lg"
        >
          {editingBook && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  As alterações salvas aqui serão refletidas instantaneamente em todo o catálogo global do TeleBooks, atualizando também as estantes dos leitores vinculados a este livro.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Título da Obra *
                  </label>
                  <input
                    type="text"
                    value={editBookTitle}
                    onChange={(e) => setEditBookTitle(e.target.value)}
                    placeholder="Ex: Os Miseráveis"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    value={editBookSubtitle}
                    onChange={(e) => setEditBookSubtitle(e.target.value)}
                    placeholder="Ex: Edição Especial Comentada"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Autor(es) * (separe múltiplos autores por vírgula)
                  </label>
                  <input
                    type="text"
                    value={editBookAuthors}
                    onChange={(e) => setEditBookAuthors(e.target.value)}
                    placeholder="Ex: Victor Hugo, Neil Gaiman"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                  <p className="text-[11px] text-slate-400">
                    O sistema vinculará e indexará automaticamente os autores na base de dados.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Editora
                  </label>
                  <input
                    type="text"
                    value={editBookPublisher}
                    onChange={(e) => setEditBookPublisher(e.target.value)}
                    placeholder="Ex: Companhia das Letras, Martin Claret"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total de Páginas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editBookPageCount}
                    onChange={(e) => setEditBookPageCount(e.target.value)}
                    placeholder="Ex: 512"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ISBN-13
                  </label>
                  <input
                    type="text"
                    value={editBookIsbn13}
                    onChange={(e) => setEditBookIsbn13(e.target.value)}
                    placeholder="Ex: 9788535902778"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ISBN-10
                  </label>
                  <input
                    type="text"
                    value={editBookIsbn10}
                    onChange={(e) => setEditBookIsbn10(e.target.value)}
                    placeholder="Ex: 8535902775"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    URL da Imagem da Capa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editBookCoverUrl}
                      onChange={(e) => setEditBookCoverUrl(e.target.value)}
                      placeholder="https://images..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                    />
                  </div>
                  {editBookCoverUrl.trim() && (
                    <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <Image
                          src={editBookCoverUrl}
                          alt="Pré-visualização da capa"
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Pré-visualização da Capa</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{editBookCoverUrl}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sinopse / Descrição
                  </label>
                  <textarea
                    rows={3}
                    value={editBookDescription}
                    onChange={(e) => setEditBookDescription(e.target.value)}
                    placeholder="Descrição bibliográfica da obra..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBook(null)}
                  disabled={isSavingBookEdit}
                  className="rounded-full text-xs w-full sm:w-auto cursor-pointer"
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveBookEdit}
                    isLoading={isSavingBookEdit}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="rounded-full text-xs font-bold w-full sm:w-auto cursor-pointer"
                  >
                    Salvar Alterações no Catálogo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
