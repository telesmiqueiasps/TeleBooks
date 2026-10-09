"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  BookmarkCheck,
  BookmarkPlus,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Hash,
  Heart,
  Layers,
  MessageSquare,
  Plus,
  Quote,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  StickyNote,
  Trash2,
  AlertCircle,
  HelpCircle,
  X,
  Folder,
  Tag,
  Palette,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  BadgeVariant,
  Input,
} from "@telebooks/ui";
import type {
  Book,
  BookStatus,
  Collection,
  UserBook,
  UserNote,
  UserQuote,
  UserTag,
} from "@telebooks/types";
import { AppShell } from "../../../components/shell/app-shell";
import { useAuth } from "../../../components/auth/auth-provider";
import { api } from "../../../lib/api";
import { BookFormModal } from "../../../components/catalog/book-form-modal";
import {
  PERSONAL_COLOR_PALETTE,
  CollectionsManagerModal,
} from "../../../components/shelf/collections-manager-modal";

const STATUS_CONFIG: Record<
  BookStatus,
  { label: string; variant: BadgeVariant; color: string; bg: string }
> = {
  want_to_read: {
    label: "Quero Ler",
    variant: "want_to_read",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  reading: {
    label: "Lendo",
    variant: "reading",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  read: {
    label: "Lido",
    variant: "read",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  paused: {
    label: "Pausado",
    variant: "paused",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
  abandoned: {
    label: "Abandonado",
    variant: "abandoned",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
  },
};

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Extrai id do livro da rota
  const bookId = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] || "" : params.id;
  }, [params]);

  // Estados principais
  const [book, setBook] = useState<Book | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [quotes, setQuotes] = useState<UserQuote[]>([]);

  // Estados de carregamento e feedback
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Aba ativa: "overview" (visão geral), "notes" (notas), "quotes" (citações), "technical" (ficha técnica)
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "quotes" | "technical">("overview");

  // Estado de cópia de ISBN
  const [copiedIsbn, setCopiedIsbn] = useState<string | null>(null);

  // Modal de edição de dados bibliográficos
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados de Coleções e Tags Pessoais
  const [userCollections, setUserCollections] = useState<Collection[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);

  // Estados do formulário de Nota
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteChapter, setNoteChapter] = useState("");
  const [notePage, setNotePage] = useState("");
  const [noteIsSpoiler, setNoteIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Estados do formulário de Citação
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteComment, setQuoteComment] = useState("");

  // Estado das anotações rápidas gerais
  const [quickNotesText, setQuickNotesText] = useState("");
  const [hasUnsavedQuickNotes, setHasUnsavedQuickNotes] = useState(false);

  // Notificação temporária
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Carrega os dados do livro e o vínculo do usuário
  const loadBookData = useCallback(async () => {
    if (!bookId) return;
    setIsLoading(true);
    setApiError(null);

    try {
      const [bookData, userBookData, collectionsData, tagsData] =
        await Promise.all([
          api.getBook(bookId),
          api.getShelfByBookId(bookId),
          api.getCollections().catch(() => []),
          api.getUserTags().catch(() => []),
        ]);

      setBook(bookData);
      setUserBook(userBookData);
      setUserCollections(collectionsData || []);
      setUserTags(tagsData || []);
      setQuickNotesText(userBookData?.private_notes || "");

      // Se o usuário tem o livro na estante, carrega notas e citações
      if (userBookData?.id) {
        try {
          const [notesData, quotesData] = await Promise.all([
            api.getUserNotes(userBookData.id),
            api.getUserQuotes(userBookData.id),
          ]);
          setNotes(notesData || []);
          setQuotes(quotesData || []);
        } catch {
          // Erro silencioso em notas secundárias
        }
      } else {
        setNotes([]);
        setQuotes([]);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro ao carregar livro";
      setApiError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  // Copiar ISBN para área de transferência
  const handleCopyIsbn = (isbn: string) => {
    navigator.clipboard.writeText(isbn);
    setCopiedIsbn(isbn);
    showToast("ISBN copiado para a área de transferência!");
    setTimeout(() => setCopiedIsbn(null), 2500);
  };

  // --------------------------------------------------------------------------
  // Ações da Estante Pessoal
  // --------------------------------------------------------------------------

  // Adicionar livro à estante pela primeira vez
  const handleAddToShelf = async (initialStatus: BookStatus = "want_to_read") => {
    if (!book) return;
    setIsSaving(true);
    try {
      const created = await api.addToShelf({
        book_id: book.id,
        status: initialStatus,
        current_page: 0,
        favorite: false,
      });
      setUserBook(created);
      showToast(`Livro adicionado à estante como "${STATUS_CONFIG[initialStatus].label}"!`);
      // Recarrega para obter relacionamentos limpos
      loadBookData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao adicionar à estante");
    } finally {
      setIsSaving(false);
    }
  };

  // Alterar status de leitura
  const handleStatusChange = async (newStatus: BookStatus) => {
    if (!userBook) {
      await handleAddToShelf(newStatus);
      return;
    }

    const previousStatus = userBook.status;
    setUserBook((prev) => (prev ? { ...prev, status: newStatus } : null));

    try {
      const updatePayload: {
        status: BookStatus;
        finished_at?: string | null;
        started_at?: string | null;
        current_page?: number;
      } = { status: newStatus };

      // Se mudou para Lido e tem total de páginas, completa páginas e define data de conclusão
      if (newStatus === "read" && book?.page_count) {
        updatePayload.current_page = book.page_count;
        if (!userBook.finished_at) {
          updatePayload.finished_at = new Date().toISOString();
        }
      }

      // Se mudou para Lendo e não tinha data de início, define hoje
      if (newStatus === "reading" && !userBook.started_at) {
        updatePayload.started_at = new Date().toISOString();
      }

      const updated = await api.updateShelfBook(userBook.id, updatePayload);
      setUserBook(updated);
      showToast(`Status atualizado para "${STATUS_CONFIG[newStatus].label}"`);
    } catch {
      setUserBook((prev) => (prev ? { ...prev, status: previousStatus } : null));
      showToast("Não foi possível atualizar o status");
    }
  };

  // Alterar nota / avaliação (1 a 5 estrelas)
  const handleRatingChange = async (newRating: number) => {
    if (!userBook) return;

    // Se clicar na mesma nota, desmarca (null)
    const finalRating = userBook.rating === newRating ? null : newRating;
    const prevRating = userBook.rating;
    setUserBook((prev) => (prev ? { ...prev, rating: finalRating } : null));

    try {
      const updated = await api.updateShelfBook(userBook.id, {
        rating: finalRating,
      });
      setUserBook(updated);
      showToast(
        finalRating ? `Avaliação definida como ${finalRating} estrelas!` : "Avaliação removida"
      );
    } catch {
      setUserBook((prev) => (prev ? { ...prev, rating: prevRating } : null));
      showToast("Erro ao salvar avaliação");
    }
  };

  // Alternar favorito
  const handleToggleFavorite = async () => {
    if (!userBook) return;
    const newFavorite = !userBook.favorite;
    setUserBook((prev) => (prev ? { ...prev, favorite: newFavorite } : null));

    try {
      const updated = await api.updateShelfBook(userBook.id, {
        favorite: newFavorite,
      });
      setUserBook(updated);
      showToast(newFavorite ? "Adicionado aos favoritos! ❤️" : "Removido dos favoritos");
    } catch {
      setUserBook((prev) => (prev ? { ...prev, favorite: !newFavorite } : null));
      showToast("Erro ao alternar favorito");
    }
  };

  // Atualizar página atual de leitura
  const handlePageUpdate = async (targetPage: number) => {
    if (!userBook || !book) return;
    const maxPages = book.page_count || 99999;
    const validPage = Math.max(0, Math.min(targetPage, maxPages));

    const prevPage = userBook.current_page;
    setUserBook((prev) => (prev ? { ...prev, current_page: validPage } : null));

    try {
      const payload: {
        current_page: number;
        status?: BookStatus;
        finished_at?: string;
      } = { current_page: validPage };

      // Se atingiu o final, marca como lido automaticamente
      if (book.page_count && validPage >= book.page_count && userBook.status !== "read") {
        payload.status = "read";
        payload.finished_at = new Date().toISOString();
      }

      const updated = await api.updateShelfBook(userBook.id, payload);
      setUserBook(updated);
      showToast(`Progresso salvo: pág. ${validPage}`);
    } catch {
      setUserBook((prev) => (prev ? { ...prev, current_page: prevPage } : null));
      showToast("Erro ao atualizar progresso");
    }
  };

  // Salvar datas de leitura
  const handleDatesUpdate = async (startedAt?: string, finishedAt?: string) => {
    if (!userBook) return;
    setIsSaving(true);
    try {
      const updated = await api.updateShelfBook(userBook.id, {
        started_at: startedAt ? new Date(startedAt).toISOString() : null,
        finished_at: finishedAt ? new Date(finishedAt).toISOString() : null,
      });
      setUserBook(updated);
      showToast("Datas de leitura atualizadas!");
    } catch {
      showToast("Erro ao atualizar datas");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar notas rápidas gerais
  const handleSaveQuickNotes = async () => {
    if (!userBook) return;
    setIsSaving(true);
    try {
      const updated = await api.updateShelfBook(userBook.id, {
        private_notes: quickNotesText,
      });
      setUserBook(updated);
      setHasUnsavedQuickNotes(false);
      showToast("Anotações gerais salvas!");
    } catch {
      showToast("Erro ao salvar anotações");
    } finally {
      setIsSaving(false);
    }
  };

  // Remover livro da estante
  const handleRemoveFromShelf = async () => {
    if (!userBook) return;
    if (!confirm("Remover este livro da sua estante? Suas notas e progresso serão desvinculados.")) {
      return;
    }
    setIsSaving(true);
    try {
      await api.removeFromShelf(userBook.id);
      setUserBook(null);
      setNotes([]);
      setQuotes([]);
      showToast("Livro removido da sua estante.");
    } catch {
      showToast("Erro ao remover da estante");
    } finally {
      setIsSaving(false);
    }
  };

  // Alterar cor pessoal da lombada
  const handlePersonalColorChange = async (color: string | null) => {
    if (!userBook) return;
    const prev = userBook.personal_color;
    setUserBook((b) => (b ? { ...b, personal_color: color } : null));

    try {
      const updated = await api.updateShelfBook(userBook.id, {
        personal_color: color,
      });
      setUserBook(updated);
      showToast(
        color ? "Cor da lombada personalizada!" : "Cor restaurada para o padrão"
      );
    } catch {
      setUserBook((b) => (b ? { ...b, personal_color: prev } : null));
      showToast("Erro ao atualizar cor");
    }
  };

  // Associar / Desassociar de Coleção
  const handleToggleCollection = async (collectionId: string) => {
    if (!userBook) return;
    const currentCollectionIds = userBook.collections?.map((c) => c.id) || [];
    const nextCollectionIds = currentCollectionIds.includes(collectionId)
      ? currentCollectionIds.filter((id) => id !== collectionId)
      : [...currentCollectionIds, collectionId];

    try {
      const updated = await api.updateShelfBook(userBook.id, {
        collection_ids: nextCollectionIds,
      });
      setUserBook(updated);
      showToast("Coleções do exemplar atualizadas!");
    } catch {
      showToast("Erro ao atualizar coleções");
    }
  };

  // Associar / Desassociar de Tag
  const handleToggleTag = async (tagId: string) => {
    if (!userBook) return;
    const currentTagIds = userBook.tags?.map((t) => t.id) || [];
    const nextTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];

    try {
      const updated = await api.updateShelfBook(userBook.id, {
        tag_ids: nextTagIds,
      });
      setUserBook(updated);
      showToast("Tags do exemplar atualizadas!");
    } catch {
      showToast("Erro ao atualizar tags");
    }
  };

  // --------------------------------------------------------------------------
  // Notas Privadas (User Notes)
  // --------------------------------------------------------------------------
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBook || !noteContent.trim()) return;

    setIsSaving(true);
    try {
      const newNote = await api.createUserNote(userBook.id, {
        content: noteContent.trim(),
        chapter: noteChapter.trim() || undefined,
        page_number: notePage ? parseInt(notePage, 10) : undefined,
        is_spoiler: noteIsSpoiler,
      });
      setNotes((prev) => [newNote, ...prev]);
      setNoteContent("");
      setNoteChapter("");
      setNotePage("");
      setNoteIsSpoiler(false);
      setIsNoteFormOpen(false);
      showToast("Nota adicionada com sucesso!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao criar nota");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Excluir esta nota permanentemente?")) return;
    try {
      await api.deleteUserNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast("Nota excluída");
    } catch {
      showToast("Erro ao excluir nota");
    }
  };

  // --------------------------------------------------------------------------
  // Citações Favoritas (User Quotes)
  // --------------------------------------------------------------------------
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userBook || !quoteContent.trim()) return;

    setIsSaving(true);
    try {
      const newQuote = await api.createUserQuote(userBook.id, {
        content: quoteContent.trim(),
        page_number: quotePage ? parseInt(quotePage, 10) : undefined,
        author_comment: quoteComment.trim() || undefined,
      });
      setQuotes((prev) => [newQuote, ...prev]);
      setQuoteContent("");
      setQuotePage("");
      setQuoteComment("");
      setIsQuoteFormOpen(false);
      showToast("Citação registrada com sucesso!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar citação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("Excluir esta citação?")) return;
    try {
      await api.deleteUserQuote(quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      showToast("Citação excluída");
    } catch {
      showToast("Erro ao excluir citação");
    }
  };

  // Cálculos de progresso e estatísticas
  const progressPercent = useMemo(() => {
    if (!book?.page_count || book.page_count <= 0 || !userBook) return 0;
    return Math.min(100, Math.round((userBook.current_page / book.page_count) * 100));
  }, [book, userBook]);

  const readingDays = useMemo(() => {
    if (!userBook?.started_at) return null;
    const start = new Date(userBook.started_at);
    const end = userBook.finished_at ? new Date(userBook.finished_at) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [userBook]);

  const formattedAuthors = useMemo(() => {
    return book?.authors?.map((a) => a.name).join(", ") || "Autor não informado";
  }, [book]);

  // Formatação de data amigável
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Input date string YYYY-MM-DD
  const toDateInputVal = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toISOString().split("T")[0] || "";
    } catch {
      return "";
    }
  };

  return (
    <AppShell>
      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl border border-slate-700/50 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ESTADO: CARREGANDO */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse max-w-6xl mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />

          {/* Hero Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 lg:col-span-3 flex justify-center">
              <div className="w-56 aspect-[2/3] bg-slate-200 dark:bg-slate-800 rounded-2xl shadow-xl" />
            </div>
            <div className="md:col-span-8 lg:col-span-9 space-y-4">
              <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : apiError || !book ? (
        /* ESTADO: ERRO OU NÃO ENCONTRADO */
        <div className="max-w-xl mx-auto text-center py-16 space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Livro não encontrado
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {apiError || "O título solicitado não pôde ser carregado ou não existe."}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/minha-biblioteca")}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar à Minha Biblioteca
            </Button>
            <Button
              variant="primary"
              onClick={loadBookData}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      ) : (
        /* ESTADO: SUCESSO - PÁGINA PREMIUM DO LIVRO */
        <div className="relative max-w-6xl mx-auto space-y-8 pb-12">
          {/* Fundo Atmosférico de Capa com Backdrop Blur */}
          {book.cover_url && (
            <div
              className="absolute -top-12 left-0 right-0 h-96 -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-15 blur-3xl scale-125"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.cover_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
            </div>
          )}

          {/* Navegação de Topo e Breadcrumb */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-full text-xs text-slate-600 dark:text-slate-300"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Editar Ficha
              </Button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: book.title,
                      text: `Confira o livro "${book.title}" no TeleBooks!`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Link do livro copiado!");
                  }
                }}
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                title="Compartilhar livro"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* =========================================================================
              HERO SECTION: CAPA 3D + METADADOS PRINCIPAIS + VÍNCULO RÁPIDO
          ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* COLUNA ESQUERDA: Capa do Livro + Ações Primárias */}
            <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center sm:items-start space-y-6">
              {/* Moldura 3D da Capa com Efeito Editorial de Lombada */}
              <div className="relative group w-48 sm:w-60 md:w-full max-w-[280px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-[#e8e4dc] dark:bg-[#1a202c] border border-black/10 dark:border-white/10">
                {/* Imagem da Capa */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    book.cover_url ||
                    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
                  }
                  alt={`Capa do livro ${book.title}`}
                  className="w-full h-full object-cover select-none"
                />

                {/* Sombra de Lombada Tridimensional (Efeito Livro Físico) */}
                <div
                  className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/35 via-black/15 to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                {/* Cor Pessoal da Lombada */}
                {userBook?.personal_color && (
                  <div
                    className="absolute inset-y-0 left-0 w-2.5 z-10 shadow-md"
                    style={{ backgroundColor: userBook.personal_color }}
                    title="Cor pessoal da lombada"
                  />
                )}

                {/* Vinco da Dobra da Capa */}
                <div
                  className="absolute inset-y-0 left-4 w-px bg-white/20 dark:bg-white/10 pointer-events-none"
                  aria-hidden="true"
                />

                {/* Badge de Status Sobreposto */}
                {userBook && (
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-md backdrop-blur-md ${
                        STATUS_CONFIG[userBook.status].bg
                      } ${STATUS_CONFIG[userBook.status].color}`}
                    >
                      {STATUS_CONFIG[userBook.status].label}
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de Ação na Estante */}
              <div className="w-full max-w-[280px] space-y-3">
                {userBook ? (
                  <>
                    {/* Seletor de Status Segmentado */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status de Leitura
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        {(["reading", "want_to_read", "read", "paused"] as BookStatus[]).map(
                          (st) => {
                            const active = userBook.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(st)}
                                className={`px-2 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                                  active
                                    ? "bg-white dark:bg-[#007BFF] text-[#007BFF] dark:text-white shadow-xs font-bold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                {STATUS_CONFIG[st].label}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* Avaliação por Estrelas Interativa + Botão de Favorito */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Minha Avaliação
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((starVal) => {
                            const isFilled =
                              userBook.rating !== null &&
                              userBook.rating !== undefined &&
                              userBook.rating >= starVal;
                            return (
                              <button
                                key={starVal}
                                type="button"
                                onClick={() => handleRatingChange(starVal)}
                                className="p-0.5 text-slate-300 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400 transition-colors"
                                title={`Avaliar com ${starVal} estrela${starVal > 1 ? "s" : ""}`}
                              >
                                <Star
                                  className={`w-5 h-5 transition-transform hover:scale-125 ${
                                    isFilled
                                      ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                                      : ""
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Favorito (Coração com feedback visual vibrante) */}
                      <button
                        type="button"
                        onClick={handleToggleFavorite}
                        className={`p-3 rounded-2xl transition-all ${
                          userBook.favorite
                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 scale-105 shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        }`}
                        title={userBook.favorite ? "Favoritado" : "Marcar como favorito"}
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform ${
                            userBook.favorite ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {/* Ação secundária: Remover da Estante */}
                    <button
                      type="button"
                      onClick={handleRemoveFromShelf}
                      className="w-full text-center text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 py-1 transition-colors"
                    >
                      Remover da minha estante
                    </button>
                  </>
                ) : (
                  /* Call to Action se o livro ainda não estiver na estante */
                  <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-center space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Este título ainda não está na sua biblioteca pessoal.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => handleAddToShelf("want_to_read")}
                      isLoading={isSaving}
                      leftIcon={<BookmarkPlus className="w-4 h-4" />}
                      className="w-full rounded-2xl shadow-lg shadow-primary/20 py-3"
                    >
                      Adicionar à Minha Estante
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: Título, Autor, Metadados e Hub de Leitura */}
            <div className="md:col-span-7 lg:col-span-8 space-y-6">
              {/* Badges de Gêneros Literários */}
              <div className="flex flex-wrap items-center gap-2">
                {book.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-primary border border-blue-500/20 tracking-wide"
                  >
                    {g.name}
                  </span>
                ))}
                {book.language && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {book.language.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Título & Subtítulo */}
              <div className="space-y-1.5">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                  {book.title}
                </h1>
                {book.subtitle && (
                  <p className="font-sans text-base sm:text-lg text-slate-500 dark:text-slate-400 italic">
                    {book.subtitle}
                  </p>
                )}
              </div>

              {/* Autor(es) em destaque */}
              <div className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">por</span>
                <span className="font-bold text-slate-900 dark:text-white font-display">
                  {formattedAuthors}
                </span>
              </div>

              {/* Chips Rápidos de Metadados Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {book.page_count ? (
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Extensão</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {book.page_count} págs
                    </div>
                  </div>
                ) : null}

                {book.publisher ? (
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      <span>Editora</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {book.publisher.name}
                    </div>
                  </div>
                ) : null}

                {book.publication_date ? (
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Publicação</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatDate(book.publication_date)}
                    </div>
                  </div>
                ) : null}

                {book.isbn13 || book.isbn10 ? (
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                      <span className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-primary" />
                        <span>ISBN</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyIsbn(book.isbn13 || book.isbn10 || "")}
                        className="hover:text-primary transition-colors"
                        title="Copiar ISBN"
                      >
                        {copiedIsbn === (book.isbn13 || book.isbn10) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                      {book.isbn13 || book.isbn10}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* =====================================================================
                  CARD DE PROGRESSO PESSOAL (MINHA LEITURA)
              ===================================================================== */}
              {userBook && (
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          Meu Acompanhamento de Leitura
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {book.page_count
                            ? `${book.page_count - userBook.current_page} páginas restantes para o fim`
                            : "Acompanhe seu progresso de leitura"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                      <span className="font-display text-2xl font-black text-primary">
                        {progressPercent}%
                      </span>
                      <span className="text-xs text-slate-500">
                        Pág. {userBook.current_page} de {book.page_count || "?"}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso em Azul Royal TeleBooks */}
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Slider Interativo de Páginas */}
                    {book.page_count && book.page_count > 0 && (
                      <input
                        type="range"
                        min={0}
                        max={book.page_count}
                        value={userBook.current_page}
                        onChange={(e) => handlePageUpdate(parseInt(e.target.value, 10))}
                        className="w-full accent-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    )}
                  </div>

                  {/* Ações Rápidas de Progresso (+10, +25, Terminar) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Avançar:</span>
                      <button
                        type="button"
                        onClick={() => handlePageUpdate(userBook.current_page + 10)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white transition-colors"
                      >
                        +10 págs
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePageUpdate(userBook.current_page + 25)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white transition-colors"
                      >
                        +25 págs
                      </button>
                    </div>

                    {userBook.status !== "read" && book.page_count && (
                      <button
                        type="button"
                        onClick={() => handlePageUpdate(book.page_count || userBook.current_page)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marcar como concluído
                      </button>
                    )}
                  </div>

                  {/* Datas de Leitura */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Início da Leitura
                      </label>
                      <input
                        type="date"
                        value={toDateInputVal(userBook.started_at)}
                        onChange={(e) =>
                          handleDatesUpdate(
                            e.target.value || undefined,
                            userBook.finished_at || undefined
                          )
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Conclusão da Leitura
                      </label>
                      <input
                        type="date"
                        value={toDateInputVal(userBook.finished_at)}
                        onChange={(e) =>
                          handleDatesUpdate(
                            userBook.started_at || undefined,
                            e.target.value || undefined
                          )
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Indicador de Dias Lendo */}
                  {readingDays !== null && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {userBook.finished_at
                          ? `Leitura completada em ${readingDays} dia${readingDays > 1 ? "s" : ""}!`
                          : `Você está lendo este livro há ${readingDays} dia${readingDays > 1 ? "s" : ""}.`}
                      </span>
                    </div>
                  )}

                  {/* =========================================================================
                      ORGANIZAÇÃO PESSOAL: COR DA LOMBADA, COLEÇÕES E TAGS
                  ========================================================================= */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Cor da Lombada */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-primary" />
                          <span>Cor Pessoal da Lombada</span>
                        </label>
                        {userBook.personal_color && (
                          <button
                            type="button"
                            onClick={() => handlePersonalColorChange(null)}
                            className="text-[11px] text-primary hover:underline font-medium"
                          >
                            Restaurar Padrão
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePersonalColorChange(null)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            !userBook.personal_color
                              ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                              : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          Padrão
                        </button>
                        {PERSONAL_COLOR_PALETTE.map((c) => {
                          const isSelected =
                            userBook.personal_color?.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handlePersonalColorChange(c.hex)}
                              className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                                isSelected
                                  ? "scale-125 ring-2 ring-offset-2 ring-primary shadow-sm"
                                  : "hover:scale-110 opacity-75 hover:opacity-100"
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

                    {/* Coleções do Usuário */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-primary" />
                          <span>Minhas Coleções</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCollectionsModalOpen(true)}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          Gerenciar Coleções
                        </button>
                      </div>

                      {userCollections.length === 0 ? (
                        <div className="text-xs text-slate-400">
                          Você ainda não possui coleções criadas.{" "}
                          <button
                            type="button"
                            onClick={() => setIsCollectionsModalOpen(true)}
                            className="text-primary hover:underline font-medium"
                          >
                            Criar primeira coleção
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {userCollections.map((col) => {
                            const isInCollection =
                              userBook.collections?.some((c) => c.id === col.id) ?? false;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => handleToggleCollection(col.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                  isInCollection
                                    ? "bg-blue-500/10 text-primary border-blue-500/40 font-semibold"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                }`}
                              >
                                <Folder className="w-3 h-3" />
                                <span>{col.name}</span>
                                {isInCollection && (
                                  <Check className="w-3 h-3 text-primary stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tags Pessoais */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <span>Minhas Tags</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCollectionsModalOpen(true)}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          Gerenciar Tags
                        </button>
                      </div>

                      {userTags.length === 0 ? (
                        <div className="text-xs text-slate-400">
                          Nenhuma tag criada ainda.{" "}
                          <button
                            type="button"
                            onClick={() => setIsCollectionsModalOpen(true)}
                            className="text-primary hover:underline font-medium"
                          >
                            Criar tags
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {userTags.map((tag) => {
                            const hasTag =
                              userBook.tags?.some((t) => t.id === tag.id) ?? false;
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleToggleTag(tag.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                  hasTag
                                    ? "bg-blue-500/10 text-primary border-blue-500/40 font-semibold"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                }`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: tag.color || "#007BFF" }}
                                />
                                <span>#{tag.name}</span>
                                {hasTag && (
                                  <Check className="w-3 h-3 text-primary stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              NAVEGAÇÃO POR ABAS EDITORIAIS
          ========================================================================= */}
          <div className="border-b border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                  activeTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Sinopse & Visão Geral</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                  activeTab === "notes"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <StickyNote className="w-4 h-4" />
                <span>Minhas Notas</span>
                {notes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {notes.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("quotes")}
                className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                  activeTab === "quotes"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Quote className="w-4 h-4" />
                <span>Citações Favoritas</span>
                {quotes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {quotes.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("technical")}
                className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all shrink-0 ${
                  activeTab === "technical"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Ficha Técnica Completa</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              CONTEÚDO DAS ABAS
          ========================================================================= */}

          {/* ABA 1: SINOPSE E VISÃO GERAL */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sinopse Principal */}
              <div className="lg:col-span-8 space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Sinopse Editorial</span>
                  </div>

                  {book.description ? (
                    <div className="font-sans text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {book.description}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Nenhuma sinopse cadastrada para este livro no momento.
                    </p>
                  )}
                </div>

                {/* Anotações Pessoais Rápidas (General Private Notes) */}
                {userBook && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span>Minhas Anotações Gerais do Livro</span>
                      </div>
                      {hasUnsavedQuickNotes && (
                        <span className="text-xs font-semibold text-amber-500">
                          Alterações não salvas
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={quickNotesText}
                      onChange={(e) => {
                        setQuickNotesText(e.target.value);
                        setHasUnsavedQuickNotes(true);
                      }}
                      placeholder="Registre impressões gerais, contexto onde conheceu o livro ou notas rápidas..."
                      className="w-full text-sm p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />

                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!hasUnsavedQuickNotes}
                        onClick={handleSaveQuickNotes}
                        isLoading={isSaving}
                        className="rounded-full px-5"
                      >
                        Salvar Anotações
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Lateral: Resumo Técnico Rápido */}
              <div className="lg:col-span-4 space-y-5">
                <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Ficha Rápida
                  </h4>

                  <dl className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <dt className="text-slate-400 font-medium">Título Original</dt>
                      <dd className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                        {book.title}
                      </dd>
                    </div>

                    {book.publisher && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-400 font-medium">Editora</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {book.publisher.name}
                        </dd>
                      </div>
                    )}

                    {book.page_count && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-400 font-medium">Páginas</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {book.page_count}
                        </dd>
                      </div>
                    )}

                    {book.language && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-400 font-medium">Idioma</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {book.language}
                        </dd>
                      </div>
                    )}

                    {book.isbn13 && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-400 font-medium">ISBN-13</dt>
                        <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {book.isbn13}
                        </dd>
                      </div>
                    )}

                    {book.isbn10 && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-400 font-medium">ISBN-10</dt>
                        <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {book.isbn10}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: MINHAS NOTAS PESSOAIS */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              {/* Topo da Aba de Notas: Botão para Adicionar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Notas e Reflexões Privadas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Anotações visíveis apenas para você durante a sua jornada de leitura.
                  </p>
                </div>

                {userBook && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNoteFormOpen(!isNoteFormOpen)}
                    leftIcon={isNoteFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    className="rounded-full"
                  >
                    {isNoteFormOpen ? "Cancelar" : "Nova Nota"}
                  </Button>
                )}
              </div>

              {/* Formulário de Criação de Nota */}
              {isNoteFormOpen && (
                <form
                  onSubmit={handleCreateNote}
                  className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Registrar Nova Anotação
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNoteFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Escreva seus pensamentos, ideias ou resumo desta parte do livro..."
                    className="w-full text-sm p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Capítulo (opcional)
                      </label>
                      <input
                        type="text"
                        value={noteChapter}
                        onChange={(e) => setNoteChapter(e.target.value)}
                        placeholder="Ex: Capítulo 4 ou Ato I"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Página (opcional)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={notePage}
                        onChange={(e) => setNotePage(e.target.value)}
                        placeholder="Ex: 142"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={noteIsSpoiler}
                          onChange={(e) => setNoteIsSpoiler(e.target.checked)}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <span>Contém spoiler</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsNoteFormOpen(false)}
                      className="rounded-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSaving}
                      className="rounded-full"
                    >
                      Salvar Nota
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista de Notas do Leitor */}
              {!userBook ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-3">
                  <StickyNote className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-500">
                    Adicione este livro à sua estante para começar a registrar anotações privadas.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddToShelf("reading")}
                    className="rounded-full"
                  >
                    Adicionar à Estante
                  </Button>
                </div>
              ) : notes.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <StickyNote className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhuma anotação registrada ainda
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Anote citações importantes, teorias, dúvidas e reflexões sobre os capítulos.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNoteFormOpen(true)}
                    className="rounded-full"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Criar Primeira Anotação
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((n) => {
                    const isRevealed = revealedSpoilers[n.id] ?? false;
                    return (
                      <div
                        key={n.id}
                        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {n.page_number && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                Pág. {n.page_number}
                              </span>
                            )}
                            {n.chapter && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {n.chapter}
                              </span>
                            )}
                            {n.is_spoiler && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                Spoiler
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatDate(n.created_at)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                            title="Excluir nota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Conteúdo com tratamento de spoiler */}
                        {n.is_spoiler && !isRevealed ? (
                          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-center space-y-2">
                            <p className="text-xs text-slate-500">
                              Esta nota foi marcada como spoiler.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRevealedSpoilers((prev) => ({
                                  ...prev,
                                  [n.id]: true,
                                }))
                              }
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              className="rounded-full text-xs"
                            >
                              Revelar Spoiler
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                            {n.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: CITAÇÕES FAVORITAS */}
          {activeTab === "quotes" && (
            <div className="space-y-6">
              {/* Topo da Aba de Citações */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Citações e Trechos Marcantes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Guarde os trechos que tocaram você e merecem ser lembrados.
                  </p>
                </div>

                {userBook && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsQuoteFormOpen(!isQuoteFormOpen)}
                    leftIcon={isQuoteFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    className="rounded-full"
                  >
                    {isQuoteFormOpen ? "Cancelar" : "Salvar Citação"}
                  </Button>
                )}
              </div>

              {/* Formulário de Citação */}
              {isQuoteFormOpen && (
                <form
                  onSubmit={handleCreateQuote}
                  className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Registrar Nova Citação
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsQuoteFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                      Texto da Citação
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={quoteContent}
                      onChange={(e) => setQuoteContent(e.target.value)}
                      placeholder="“Digite aqui o trecho memorável do livro...”"
                      className="w-full text-sm font-serif italic p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Página (opcional)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quotePage}
                        onChange={(e) => setQuotePage(e.target.value)}
                        placeholder="Ex: 87"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Seu Comentário / Reflexão (opcional)
                      </label>
                      <input
                        type="text"
                        value={quoteComment}
                        onChange={(e) => setQuoteComment(e.target.value)}
                        placeholder="Por que essa frase tocou você?"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsQuoteFormOpen(false)}
                      className="rounded-full"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSaving}
                      className="rounded-full"
                    >
                      Salvar Citação
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista de Citações */}
              {!userBook ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-3">
                  <Quote className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-500">
                    Adicione este livro à sua estante para começar a registrar citações marcantes.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddToShelf("reading")}
                    className="rounded-full"
                  >
                    Adicionar à Estante
                  </Button>
                </div>
              ) : quotes.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Quote className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhuma citação registrada ainda
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Salve frases memoráveis e passagens que você deseja revisitar no futuro.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuoteFormOpen(true)}
                    className="rounded-full"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Salvar Primeira Citação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      className="relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          {q.page_number ? (
                            <span className="font-semibold text-primary">
                              Página {q.page_number}
                            </span>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(q.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                            title="Excluir citação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Texto com tipografia editorial elegante */}
                        <blockquote className="font-serif italic text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed relative pl-4 border-l-2 border-primary/50">
                          “{q.content}”
                        </blockquote>
                      </div>

                      {/* Comentário Pessoal do Leitor */}
                      {q.author_comment && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Minha reflexão:{" "}
                          </span>
                          {q.author_comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: FICHA TÉCNICA E EDIÇÕES */}
          {activeTab === "technical" && (
            <div className="space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Dados Bibliográficos & Especificações Técnicas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informações globais do catálogo catalogadas segundo padrões ISBN.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Título Completo
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {book.title}
                    </p>
                  </div>

                  {book.subtitle && (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                        Subtítulo
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {book.subtitle}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Autores
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {formattedAuthors}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Editora
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {book.publisher?.name || "Não informada"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Número de Páginas
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {book.page_count ? `${book.page_count} páginas` : "Não informado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Data de Publicação
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {formatDate(book.publication_date) || "Não informada"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Idioma
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {book.language || "pt-BR"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      ISBN-13
                    </span>
                    <p className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                      {book.isbn13 || "Não registrado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      ISBN-10
                    </span>
                    <p className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                      {book.isbn10 || "Não registrado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                      Identificador Global (ID)
                    </span>
                    <p className="font-mono text-slate-500 text-xs truncate">
                      {book.id}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    className="rounded-full text-xs"
                  >
                    Editar Informações no Catálogo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal para Editar Metadados Globais do Catálogo */}
          {book && (
            <BookFormModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              bookToEdit={book}
              onSuccess={(updatedBook) => {
                setBook(updatedBook);
                setIsEditModalOpen(false);
                showToast("Dados do livro atualizados com sucesso!");
              }}
            />
          )}

          {/* Modal de Gestão de Coleções e Tags */}
          <CollectionsManagerModal
            isOpen={isCollectionsModalOpen}
            onClose={() => setIsCollectionsModalOpen(false)}
            onChanged={loadBookData}
          />
        </div>
      )}
    </AppShell>
  );
}
