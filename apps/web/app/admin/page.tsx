"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
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
  ArrowLeft,
  AlertCircle,
  Filter,
  Edit3,
  Sparkles,
} from "lucide-react";
import { AppShell } from "../../components/shell/app-shell";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";
import { Button, Modal } from "@telebooks/ui";
import type { BookSubmission, BookSubmissionUpdate, SubmissionStatus } from "@telebooks/types";

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

export default function AdminModerationPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();

  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<SubmissionStatus | "all">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Ações de Moderação
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<BookSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edição de Submissão antes de Aprovar
  const [editingItem, setEditingItem] = useState<BookSubmission | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editAuthors, setEditAuthors] = useState("");
  const [editPublisher, setEditPublisher] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsbn13, setEditIsbn13] = useState("");
  const [editIsbn10, setEditIsbn10] = useState("");
  const [editPageCount, setEditPageCount] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (sub: BookSubmission) => {
    setEditingItem(sub);
    setEditTitle(sub.title || "");
    setEditSubtitle(sub.subtitle || "");
    setEditAuthors(sub.author_names?.join(", ") || "");
    setEditPublisher(sub.publisher_name || "");
    setEditDescription(sub.description || "");
    setEditIsbn13(sub.isbn13 || "");
    setEditIsbn10(sub.isbn10 || "");
    setEditPageCount(sub.page_count ? String(sub.page_count) : "");
    setEditCoverUrl(sub.cover_url || "");
  };

  const handleSaveEdit = async (andApprove: boolean = false) => {
    if (!editingItem || isSavingEdit) return;

    if (!editTitle.trim()) {
      showToast("O título da obra é obrigatório.");
      return;
    }

    const cleanAuthors = editAuthors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    if (cleanAuthors.length === 0) {
      showToast("Informe ao menos um autor para a obra.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload: BookSubmissionUpdate = {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || null,
        author_names: cleanAuthors,
        publisher_name: editPublisher.trim() || null,
        description: editDescription.trim() || null,
        isbn13: editIsbn13.trim() || null,
        isbn10: editIsbn10.trim() || null,
        page_count: editPageCount ? parseInt(editPageCount, 10) : null,
        cover_url: editCoverUrl.trim() || null,
      };

      const updated = await api.updateBookSubmission(editingItem.id, payload);

      if (andApprove) {
        await api.approveBookSubmission(editingItem.id);
        showToast(`Livro "${updated.title}" corrigido e aprovado com sucesso!`);
        setSubmissions((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? { ...updated, status: "approved" as SubmissionStatus } : item
          )
        );
        if (selectedStatus === "pending") {
          setSubmissions((prev) => prev.filter((item) => item.id !== editingItem.id));
        }
      } else {
        showToast("Correções salvas com sucesso!");
        setSubmissions((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...updated } : item))
        );
      }

      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alterações.";
      showToast(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = selectedStatus === "all" ? undefined : selectedStatus;
      const res = await api.getAdminBookSubmissions({
        status: statusParam,
        page: 1,
        page_size: 50,
      });
      setSubmissions(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar fila de moderação.";
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      if (profile && profile.role !== "admin") {
        // Usuário sem privilégios de administrador
        return;
      }
      loadSubmissions();
    }
  }, [isAuthLoading, user, profile, loadSubmissions]);

  const handleApprove = async (sub: BookSubmission) => {
    if (processingId) return;
    setProcessingId(sub.id);
    try {
      await api.approveBookSubmission(sub.id);
      showToast(`Livro "${sub.title}" aprovado e adicionado ao catálogo!`);
      // Atualiza lista localmente
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === sub.id ? { ...item, status: "approved" as SubmissionStatus } : item
        )
      );
      if (selectedStatus === "pending") {
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
      if (selectedStatus === "pending") {
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
            Esta área é destinada exclusivamente à equipe de suporte e moderação do TeleBooks para análise e aprovação de livros manuais.
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

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = sub.title.toLowerCase().includes(q);
    const authorMatch = sub.author_names?.some((a) => a.toLowerCase().includes(q));
    const isbnMatch = (sub.isbn13 && sub.isbn13.includes(q)) || (sub.isbn10 && sub.isbn10.includes(q));
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
              <span className="text-xs text-slate-400">Suporte TeleBooks</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Moderação de Livros Manuais
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Analise e aprove as obras cadastradas manualmente pelos leitores antes de integrá-las ao acervo global.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSubmissions}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
              className="rounded-full text-xs font-semibold"
            >
              Atualizar
            </Button>
          </div>
        </div>

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
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedStatus === st.id
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
            />
          </div>
        </div>

        {/* Lista de Livros Submetidos */}
        {isLoading ? (
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
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      {sub.publisher_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {sub.publisher_name}
                        </span>
                      )}
                      {sub.page_count && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {sub.page_count} páginas
                        </span>
                      )}
                      {sub.isbn13 && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          ISBN: {sub.isbn13}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        Submetido {formatRelativeTime(sub.created_at)}
                      </span>
                    </div>

                    {/* Sinopse */}
                    {sub.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        {sub.description}
                      </p>
                    )}

                    {/* Motivo caso rejeitado */}
                    {sub.status === "rejected" && sub.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Motivo da recusa:</strong> {sub.rejection_reason}
                      </div>
                    )}

                    {/* Usuário Submissor e Ações */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cadastrado por:</span>
                        <strong className="text-slate-700 dark:text-slate-300">
                          @{sub.user?.username || "leitor"}
                        </strong>
                      </div>

                      {/* Botões de Ação para Pendentes */}
                      {sub.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenEdit(sub)}
                            leftIcon={<Edit3 className="w-3.5 h-3.5 text-blue-500" />}
                            className="rounded-full text-xs font-semibold"
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
                            className="rounded-full text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
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
                            className="rounded-full text-xs font-bold"
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

        {/* Modal de Confirmação de Reprovação com Motivo */}
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
                className="rounded-full text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={!!processingId}
                className="rounded-full text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirmar Reprovação
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Edição de Submissão antes de Aprovar */}
        <Modal
          isOpen={!!editingItem}
          onClose={() => {
            if (!isSavingEdit) setEditingItem(null);
          }}
          title="Editar Dados da Obra antes de Aprovar"
          size="lg"
        >
          {editingItem && (
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
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
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
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
                    value={editAuthors}
                    onChange={(e) => setEditAuthors(e.target.value)}
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
                    value={editPublisher}
                    onChange={(e) => setEditPublisher(e.target.value)}
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
                    value={editPageCount}
                    onChange={(e) => setEditPageCount(e.target.value)}
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
                    value={editIsbn13}
                    onChange={(e) => setEditIsbn13(e.target.value)}
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
                    value={editIsbn10}
                    onChange={(e) => setEditIsbn10(e.target.value)}
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
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
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
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Breve descrição da obra..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006CEB]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                  disabled={isSavingEdit}
                  className="rounded-full text-xs w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveEdit(false)}
                    isLoading={isSavingEdit}
                    className="rounded-full text-xs w-full sm:w-auto font-semibold"
                  >
                    Salvar Correções
                  </Button>
                  {editingItem.status === "pending" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEdit(true)}
                      isLoading={isSavingEdit}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="rounded-full text-xs font-bold w-full sm:w-auto"
                    >
                      Salvar e Aprovar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
