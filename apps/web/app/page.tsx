"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Send,
  Sparkles,
  Quote,
  Search,
  X,
  Library,
  Globe,
  Lock,
  BookmarkCheck,
  Check,
  Trash2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import type { FeedPost, Book, FeedComment } from "@telebooks/types";
import { Button, Card, CardContent, Badge, Skeleton, cn } from "@telebooks/ui";
import { AppShell } from "../components/shell/app-shell";
import { useAuth } from "../components/auth/auth-provider";
import { api } from "../lib/api";

export default function HomePage() {
  const { user, profile, isLoading: isAuthLoading, updateProfile } = useAuth();
  const router = useRouter();

  // Estados do Feed
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<"all" | "quotes" | "books">("all");

  // Estados de Nova Publicação
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Seletor de Livros (Autocomplete / Busca)
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  // Estados de Interação (Comentários e Compartilhamento)
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Carregar Feed
  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getFeed(1, 30);
      setPosts(data.items || []);
    } catch (err) {
      console.error("Erro ao carregar feed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      loadFeed();
    }
  }, [user, isAuthLoading, router, loadFeed]);

  // Busca rápida de livros para vincular à postagem
  useEffect(() => {
    if (!bookSearchQuery.trim()) {
      setBookSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingBooks(true);
        const res = await api.getBooks({ q: bookSearchQuery.trim(), page_size: 5 });
        setBookSearchResults(res.items || []);
      } catch {
        setBookSearchResults([]);
      } finally {
        setIsSearchingBooks(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bookSearchQuery]);

  // Submissão de nova publicação
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);

      // Se o perfil do usuário for privado, ativa como público para publicar no feed
      if (profile && !profile.is_public) {
        await updateProfile({ is_public: true });
      }

      const newPost = await api.createFeedPost({
        content: content.trim(),
        book_id: selectedBook ? selectedBook.id : null,
        page_number: pageNumber ? parseInt(pageNumber, 10) : null,
      });

      // Adiciona no topo do feed imediatamente
      setPosts((prev) => [newPost, ...prev]);

      // Limpar formulário
      setContent("");
      setPageNumber("");
      setSelectedBook(null);
      setIsBookPickerOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao publicar no feed.";
      setPostError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternar Curtida (Like / Unlike) com Atualização Otimista
  const handleToggleLike = async (postId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Atualização otimista imediata na UI
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const currentlyLiked = post.has_liked;
          return {
            ...post,
            has_liked: !currentlyLiked,
            likes_count: currentlyLiked
              ? Math.max(0, post.likes_count - 1)
              : post.likes_count + 1,
          };
        }
        return post;
      })
    );

    try {
      // Se o perfil estiver privado, torna público
      if (profile && !profile.is_public) {
        await updateProfile({ is_public: true });
      }

      const res = await api.toggleFeedLike(postId);
      // Sincroniza contador oficial retornado
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, has_liked: res.has_liked, likes_count: res.likes_count }
            : post
        )
      );
    } catch (err) {
      console.error("Erro ao curtir publicação:", err);
      // Reverte em caso de falha
      loadFeed();
    }
  };

  // Adicionar Comentário
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setSubmittingCommentId(postId);

      if (profile && !profile.is_public) {
        await updateProfile({ is_public: true });
      }

      const newComment = await api.createFeedComment(postId, text);

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: post.comments_count + 1,
              comments: [...(post.comments || []), newComment],
            };
          }
          return post;
        })
      );

      // Limpa input
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Erro ao comentar:", err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  // Excluir Publicação
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;

    try {
      await api.deleteFeedPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Erro ao excluir publicação:", err);
    }
  };

  // Copiar Link da Publicação
  const handleCopyLink = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  // Formatação de data relativa amigável
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMin < 1) return "agora mesmo";
      if (diffMin < 60) return `há ${diffMin} min`;
      if (diffHrs < 24) return `há ${diffHrs}h`;
      if (diffDays === 1) return "ontem";
      if (diffDays < 7) return `há ${diffDays} dias`;
      return past.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return "recentemente";
    }
  };

  // Filtragem dos posts
  const filteredPosts = useMemo(() => {
    if (feedFilter === "books") {
      return posts.filter((p) => p.book_id !== null);
    }
    if (feedFilter === "quotes") {
      return posts.filter((p) => p.page_number !== null || p.content.includes("“") || p.content.includes("\""));
    }
    return posts;
  }, [posts, feedFilter]);

  const userInitials = (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Leitor"
  )
    .substring(0, 2)
    .toUpperCase();

  return (
    <AppShell currentTab="home">
      <div className="max-w-6xl mx-auto py-2 sm:py-4">
        
        {/* Grid de 2 Colunas: Feed Principal + Coluna de Contexto */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          {/* =========================================================================
              COLUNA PRINCIPAL DO FEED (ESQUERDA - 2 COLUNAS)
          ========================================================================= */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Caixa de Criação de Postagem */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6 space-y-4">
                
                {/* Linha do Autor */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || "O que você está lendo hoje?"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>Publicação aberta no Feed da Comunidade</span>
                    </p>
                  </div>
                </div>

                {/* Formulário de Post */}
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Compartilhe uma citação marcante, frase ou reflexão sobre sua leitura..."
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:bg-white dark:focus:bg-[#0F172A] transition-all resize-none"
                  />

                  {/* Livro Selecionado Badge */}
                  {selectedBook && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedBook.cover_url ? (
                          <img
                            src={selectedBook.cover_url}
                            alt=""
                            className="w-7 h-10 object-cover rounded shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-10 bg-blue-200 dark:bg-blue-900 rounded flex items-center justify-center shrink-0">
                            <BookOpen className="w-3.5 h-3.5 text-[#007BFF]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-blue-900 dark:text-blue-100 truncate">
                            {selectedBook.title}
                          </p>
                          <p className="text-[11px] text-blue-700 dark:text-blue-300 truncate">
                            {selectedBook.author_name || "Autor desconhecido"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBook(null)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-white rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        title="Remover livro vinculado"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Seletor de Livro Acordeão / Modal */}
                  {isBookPickerOpen && !selectedBook && (
                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={bookSearchQuery}
                          onChange={(e) => setBookSearchQuery(e.target.value)}
                          placeholder="Digite o título do livro para vincular..."
                          className="w-full pl-9 pr-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                          autoFocus
                        />
                      </div>

                      {isSearchingBooks && (
                        <p className="text-xs text-slate-500 text-center py-2">Buscando no acervo...</p>
                      )}

                      {bookSearchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {bookSearchResults.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedBook(b);
                                setIsBookPickerOpen(false);
                                setBookSearchQuery("");
                              }}
                              className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                            >
                              <div className="w-6 h-8 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                {b.cover_url ? (
                                  <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <BookOpen className="w-3 h-3 text-[#007BFF]" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.title}</p>
                                <p className="text-[11px] text-slate-500 truncate">{b.author_name || (b.authors && b.authors.length > 0 ? b.authors.map((a: any) => a.name).join(", ") : "Autor desconhecido")}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Barra de Ferramentas da Postagem */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {/* Botão Vincular Livro */}
                      <button
                        type="button"
                        onClick={() => setIsBookPickerOpen(!isBookPickerOpen)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                          selectedBook || isBookPickerOpen
                            ? "bg-blue-50 text-[#007BFF] border-blue-200 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200"
                        )}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{selectedBook ? "Trocar Livro" : "Vincular Livro"}</span>
                      </button>

                      {/* Campo Opcional: Página */}
                      <input
                        type="number"
                        min="1"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Pág. nº"
                        className="w-20 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                        title="Número da página da citação (opcional)"
                      />
                    </div>

                    {/* Botão de Publicação */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !content.trim()}
                      className="rounded-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] text-white px-5 py-1.5 text-xs font-bold shadow-md shadow-[#007BFF]/20 disabled:opacity-50"
                      rightIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      {isSubmitting ? "Publicando..." : "Publicar"}
                    </Button>
                  </div>

                  {postError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{postError}</span>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* 2. Filtros do Feed */}
            <div className="flex items-center justify-between pb-1">
              <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFeedFilter("all")}
                  className={cn(
                    "px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    feedFilter === "all"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] dark:text-[#38BDF8] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setFeedFilter("books")}
                  className={cn(
                    "px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    feedFilter === "books"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] dark:text-[#38BDF8] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Com Livros
                </button>
                <button
                  type="button"
                  onClick={() => setFeedFilter("quotes")}
                  className={cn(
                    "px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    feedFilter === "quotes"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] dark:text-[#38BDF8] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Citações & Frases
                </button>
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                {filteredPosts.length} {filteredPosts.length === 1 ? "publicação" : "publicações"}
              </span>
            </div>

            {/* 3. Lista de Publicações do Feed */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-3xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-8 w-40" />
                  </Card>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto">
                  <Quote className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nenhuma publicação encontrada
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Seja o primeiro a compartilhar uma frase marcante ou comentário sobre o livro que está lendo!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const isAuthor = user?.id === post.user_id;
                  const isCommentsOpen = openCommentsPostId === post.id;
                  const postInitials = (
                    post.author.full_name ||
                    post.author.username ||
                    "L"
                  )
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <Card
                      key={post.id}
                      id={`post-${post.id}`}
                      className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <CardContent className="p-4 sm:p-6 space-y-3.5">
                        
                        {/* Topo do Card: Autor e Data */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {post.author.avatar_url ? (
                              <img
                                src={post.author.avatar_url}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {postInitials}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {post.author.full_name || post.author.username}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">
                                  @{post.author.username}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-sans">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimeAgo(post.created_at)}</span>
                                {post.page_number && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      Pág. {post.page_number}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações do Autor (Excluir) */}
                          {isAuthor && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Excluir minha publicação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Bloco de Livro Vinculado (se houver) */}
                        {post.book && (
                          <Link
                            href={`/livros/${post.book.id}`}
                            className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
                          >
                            <div className="w-8 h-12 bg-blue-100 dark:bg-blue-950 rounded overflow-hidden shrink-0 shadow-xs">
                              {post.book.cover_url ? (
                                <img
                                  src={post.book.cover_url}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-[#007BFF]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                                {post.book.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {post.book.author_name || "Autor desconhecido"}
                              </p>
                            </div>
                            <Badge variant="outline" size="sm" className="shrink-0 text-[10px] hidden sm:inline-flex">
                              Ver Livro
                            </Badge>
                          </Link>
                        )}

                        {/* Conteúdo da Publicação */}
                        <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                          {post.content}
                        </div>

                        {/* Rodapé de Interações (Like, Comentários, Compartilhar) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          <div className="flex items-center gap-4">
                            {/* Curtir */}
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              className={cn(
                                "flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all active:scale-110 cursor-pointer",
                                post.has_liked
                                  ? "text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40"
                                  : "text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              )}
                              title={post.has_liked ? "Descurtir" : "Curtir publicação"}
                            >
                              <Heart
                                className={cn(
                                  "w-4 h-4 transition-transform",
                                  post.has_liked ? "fill-rose-500 text-rose-500" : ""
                                )}
                              />
                              <span>{post.likes_count}</span>
                            </button>

                            {/* Comentários */}
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCommentsPostId(
                                  isCommentsOpen ? null : post.id
                                )
                              }
                              className={cn(
                                "flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all cursor-pointer",
                                isCommentsOpen
                                  ? "text-[#007BFF] font-bold bg-blue-50 dark:bg-blue-950/40"
                                  : "text-slate-500 hover:text-[#007BFF] hover:bg-slate-100 dark:hover:bg-slate-800"
                              )}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments_count}</span>
                            </button>
                          </div>

                          {/* Compartilhar / Copiar Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(post.id)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-1 px-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Copiar link da publicação"
                          >
                            {copiedPostId === post.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] text-emerald-600 font-bold">Copiado!</span>
                              </>
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Gaveta de Comentários Expansível */}
                        {isCommentsOpen && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                            
                            {/* Lista de Comentários Anteriores */}
                            {post.comments && post.comments.length > 0 ? (
                              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                {post.comments.map((comment: FeedComment) => (
                                  <div
                                    key={comment.id}
                                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {comment.author?.full_name || comment.author?.username || "Leitor"}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {formatTimeAgo(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                      {comment.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 text-center py-2 font-sans">
                                Seja o primeiro a comentar nesta publicação!
                              </p>
                            )}

                            {/* Campo de Novo Comentário */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) =>
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id);
                                  }
                                }}
                                placeholder="Escreva um comentário..."
                                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(post.id)}
                                disabled={
                                  submittingCommentId === post.id ||
                                  !commentInputs[post.id]?.trim()
                                }
                                className="rounded-full px-3.5 bg-[#007BFF] text-white shrink-0"
                              >
                                {submittingCommentId === post.id ? "..." : "Enviar"}
                              </Button>
                            </div>

                          </div>
                        )}

                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          </div>

          {/* =========================================================================
              COLUNA LATERAL DIREITA DE SUPORTE (DESKTOP - 1 COLUNA)
          ========================================================================= */}
          <div className="hidden lg:block space-y-6 sticky top-20">
            
            {/* Card 1: Meu Perfil & Privacidade */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || "Meu Perfil"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      @{profile?.username || user?.user_metadata?.username || "leitor"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 font-medium">Status no Feed:</span>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Perfil Público</span>
                  </div>
                </div>

                <Link href="/perfil" className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full text-xs"
                    leftIcon={<User className="w-3.5 h-3.5 text-[#007BFF]" />}
                  >
                    Editar Perfil
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card 2: Sobre o Feed TeleBooks */}
            <Card className="rounded-3xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-[#0F172A] dark:to-blue-950/20 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#007BFF] text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Feed Literário Aberto</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  O que compartilhar no Feed?
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Frases célebres e trechos que você destacou no seu livro.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Impressões sinceras ao terminar um capítulo ou obra.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Indicações de leitura para inspirar outros leitores da comunidade.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Card 3: Acesso Rápido à Estante */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Library className="w-4 h-4 text-[#007BFF]" />
                  <span>Sua Biblioteca Pessoal</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Acompanhe seu progresso de leitura, edições cadastradas e organize sua estante personalizada.
                </p>
                <div className="flex gap-2 pt-1">
                  <Link href="/minha-biblioteca" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
                      Minha Estante
                    </Button>
                  </Link>
                  <Link href="/leitura-atual" className="flex-1">
                    <Button size="sm" className="w-full rounded-full text-xs bg-[#007BFF] text-white">
                      Lendo Agora
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </AppShell>
  );
}
